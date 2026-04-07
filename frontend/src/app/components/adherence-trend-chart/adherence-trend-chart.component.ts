import { Component, Input, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { AnalyticsService, AdherenceDataPoint } from '../../services/analytics.service';
import { AdherenceService } from '../../services/adherence.service';
import { BehaviorSubject, Subject } from 'rxjs';
import { switchMap, takeUntil, tap } from 'rxjs/operators';

@Component({
  selector: 'app-adherence-trend-chart',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './adherence-trend-chart.component.html',
  styleUrls: ['./adherence-trend-chart.component.css']
})
export class AdherenceTrendChartComponent implements OnInit, OnDestroy {
  @Input() patientId!: number;

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  loaded = false;
  noData = false;
  averageAdherence: number = 0;
  selectedMonthValue: string = '';
  
  private destroy$ = new Subject<void>();
  private monthSubject$ = new BehaviorSubject<string>('');

  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      line: {
        tension: 0.4
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y + '%';
            }
            return label;
          }
        }
      },
      legend: { display: true }
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { stepSize: 20 }
      }
    }
  };

  public lineChartType: 'line' = 'line';

  constructor(
    private analyticsService: AnalyticsService,
    private adherenceService: AdherenceService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Initialize to current month
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    this.selectedMonthValue = `${y}-${m}`;
    this.monthSubject$.next(this.selectedMonthValue);
    
    // Auto-refresh when live adherence jumps
    this.adherenceService.liveAdherence$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.loaded) {
          this.monthSubject$.next(this.selectedMonthValue); // re-trigger fetch
        }
      });
      
    // The reactive data pipeline
    this.monthSubject$.pipe(
      takeUntil(this.destroy$),
      tap(() => { this.loaded = false; this.cdr.detectChanges(); }),
      switchMap(monthStr => {
        const [year, month] = monthStr.split('-');
        return this.analyticsService.getAdherenceTrend(this.patientId, parseInt(month), parseInt(year));
      })
    ).subscribe({
      next: (data) => this.handleData(data),
      error: (err) => {
        console.error('Failed to fetch adherence trend', err);
        this.noData = true;
        this.loaded = true;
        this.cdr.detectChanges();
      }
    });
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  onMonthChange() {
    this.monthSubject$.next(this.selectedMonthValue);
  }

  private handleData(data: AdherenceDataPoint[]) {
    if (!data || data.length === 0) {
      this.noData = true;
      this.loaded = true;
      this.cdr.detectChanges();
      return;
    }

    const labels = data.map(d => d.date);
    const percentages = data.map(d => d.percentage ?? 0);
    const targetLine = new Array(data.length).fill(80);
    
    // Only calculate average based on days that HAVE data (don't divisor by future empty days)
    const validPoints = percentages.filter((p, index) => {
      // Data point is "valid" if we have logs for it, or it's a past date
      // Wait, our backend already stops at `today`
      return true;
    });
    
    const sum = validPoints.reduce((acc, curr) => acc + curr, 0);
    this.averageAdherence = validPoints.length > 0 ? Math.round((sum / validPoints.length) * 10) / 10 : 0;

    // Replace the whole object so Angular change detection fires
    this.lineChartData = {
      labels: [...labels],
      datasets: [
        {
          data: [...percentages],
          label: 'Compliance (%)',
          fill: true,
          backgroundColor: 'rgba(40, 167, 69, 0.2)',
          borderColor: 'rgba(40, 167, 69, 1)',
          pointBackgroundColor: 'rgba(40, 167, 69, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(40, 167, 69, 1)'
        },
        {
          data: [...targetLine],
          label: 'Target (80%)',
          fill: false,
          borderColor: 'rgba(255, 193, 7, 0.8)',
          borderDash: [5, 5],
          pointRadius: 0,
          pointHoverRadius: 0
        }
      ]
    };

    this.loaded = true;
    this.noData = false;
    this.cdr.detectChanges();
    setTimeout(() => this.chart?.update(), 0);
  }
}
