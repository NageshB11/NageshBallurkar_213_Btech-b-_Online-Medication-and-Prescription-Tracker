import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService, PharmacyIntelligenceDTO, StockOptimizationDTO } from '../../services/analytics.service';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

@Component({
  selector: 'app-pharmacy-intelligence',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './pharmacy-intelligence.component.html',
  styleUrl: './pharmacy-intelligence.component.css'
})
export class PharmacyIntelligenceComponent implements OnInit {
  @Input() showTitle: boolean = true;
  analyticsData?: PharmacyIntelligenceDTO;
  loading = true;
  today: Date = new Date();

  // ... (Charts configuration remain same)
  
  // Chart A: Sales vs Stock (Bar)
  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    scales: {
      x: {},
      y: { min: 0 }
    },
    plugins: {
      legend: { display: true },
    }
  };
  public barChartType: ChartType = 'bar';
  public barChartData?: ChartData<'bar'>;

  // Chart B: Expiration Radar (Doughnut)
  public doughnutChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' },
    }
  };
  public doughnutChartType: ChartType = 'doughnut';
  public doughnutChartData?: ChartData<'doughnut'>;

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.analyticsService.getPharmacyIntelligence().subscribe({
      next: (data) => {
        this.analyticsData = data;
        this.prepareBarChart(data.topSelling);
        this.prepareDoughnutChart(data.expiryInsights);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching pharmacy intelligence', err);
        this.loading = false;
      }
    });
  }

  prepareBarChart(topSelling: StockOptimizationDTO[]): void {
    this.barChartData = {
      labels: topSelling.map(d => d.productName),
      datasets: [
        { 
          data: topSelling.map(d => d.currentStock), 
          label: 'Current Stock',
          backgroundColor: '#10b981', // Success Green
          borderRadius: 6
        },
        { 
          data: topSelling.map(d => d.totalUnitsSold), 
          label: 'Total Sales (30d)',
          backgroundColor: '#0984e3', // Action Blue
          borderRadius: 6
        }
      ]
    };
  }

  prepareDoughnutChart(insights: any): void {
    this.doughnutChartData = {
      labels: ['Expiring 30d', 'Expiring 60d', 'Expiring 90d', 'Expired'],
      datasets: [{
        data: [
          insights.within30Days, 
          insights.within60Days, 
          insights.within90Days,
          insights.totalExpired
        ],
        backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#1f2937'],
        hoverOffset: 4
      }]
    };
  }

  getOptimizationRatio(item: StockOptimizationDTO): number {
    if (item.currentStock === 0) return 100;
    return Math.min((item.totalUnitsSold / item.currentStock) * 100, 100);
  }

  getOptimizationStatus(item: StockOptimizationDTO): string {
    if (item.currentStock > (item.totalUnitsSold * 5)) return 'OVERSTOCK';
    if (item.status === 'CRITICAL') return 'UNDERSTOCK';
    if (item.currentStock <= item.reorderPoint) return 'RESTOCK';
    return 'OPTIMIZED';
  }

  getStatusClass(item: StockOptimizationDTO): string {
    const status = this.getOptimizationStatus(item);
    switch(status) {
      case 'OVERSTOCK': return 'bg-warning text-dark';
      case 'UNDERSTOCK': return 'bg-danger text-white';
      case 'RESTOCK': return 'bg-info text-dark';
      default: return 'bg-success text-white';
    }
  }

  applyAction(item: StockOptimizationDTO, action: string): void {
    console.log(`Action ${action} applied to ${item.productName}`);
  }

  getTotalUnitsSold(): number {
    return this.analyticsData?.topSelling.reduce((sum, d) => sum + Number(d.totalUnitsSold), 0) ?? 0;
  }

  getTopSellerPercent(item: StockOptimizationDTO): number {
    const max = Math.max(...(this.analyticsData?.topSelling.map(d => Number(d.totalUnitsSold)) ?? [1]));
    return max > 0 ? (Number(item.totalUnitsSold) / max) * 100 : 0;
  }
}
