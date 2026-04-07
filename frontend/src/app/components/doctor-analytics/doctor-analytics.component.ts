import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { AnalyticsService, DoctorAnalyticsSummaryDTO } from '../../services/analytics.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-doctor-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './doctor-analytics.component.html',
  styleUrls: ['./doctor-analytics.component.css']
})
export class DoctorAnalyticsComponent implements OnInit {
  summary: DoctorAnalyticsSummaryDTO | null = null;
  loading = true;
  error = false;

  public barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const val = context.parsed.y;
            return label.includes('Adherence') ? `${label}: ${val}%` : `${label}: ${val}`;
          }
        }
      }
    },
    scales: {
      yLeft: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: 'Prescriptions Issued' },
        min: 0
      },
      yRight: {
        type: 'linear',
        position: 'right',
        title: { display: true, text: 'Avg Adherence (%)' },
        min: 0,
        max: 100,
        grid: { drawOnChartArea: false }
      }
    }
  };

  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  constructor(
    private analyticsService: AnalyticsService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.analyticsService.getDoctorAnalyticsSummary().subscribe({
      next: (data) => {
        this.summary = data;
        this.buildChart();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load analytics', err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  private buildChart() {
    if (!this.summary || !this.summary.monthlyMatrix) return;

    // The backend provides months descending (oldest to newest based on the loop: 5 to 0)
    // Actually our backend loop does `for (int i = 5; i >= 0; i--)` where 5 is oldest, so order is correct.
    const labels = this.summary.monthlyMatrix.map(m => m.month);
    const countData = this.summary.monthlyMatrix.map(m => m.countIssued);
    const adherenceData = this.summary.monthlyMatrix.map(m => m.avgAdherence);

    this.barChartData = {
      labels: labels,
      datasets: [
        {
          label: 'Prescriptions Issued',
          data: countData,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: 'yLeft'
        },
        {
          label: 'Avg Adherence Success',
          data: adherenceData,
          backgroundColor: 'rgba(40, 167, 69, 0.6)',
          borderColor: 'rgba(40, 167, 69, 1)',
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: 'yRight'
        }
      ]
    };
  }

  logout() {
    this.authService.logout();
  }

  viewPatient(patientId: number) {
    this.router.navigate(['/doctor/patients', patientId]);
  }
}
