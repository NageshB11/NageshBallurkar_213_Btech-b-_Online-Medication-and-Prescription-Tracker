import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VitalsService, HealthVitals } from '../../services/vitals.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
    selector: 'app-vitals-chart',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="apollo-card p-4 h-100">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="text-uppercase text-secondary small fw-bold m-0">Health Trends</h6>
        <span class="badge bg-primary-subtle text-primary rounded-pill">Last 7 Days</span>
      </div>
      <div class="chart-container" style="position: relative; height: 200px; width: 100%;">
         <canvas id="vitalsChart"></canvas>
      </div>
      <div class="mt-3 d-flex justify-content-around text-center">
         <div>
            <small class="text-muted d-block">Avg BP</small>
            <span class="fw-bold">{{avgSystolic}}/{{avgDiastolic}}</span>
         </div>
         <div>
            <small class="text-muted d-block">Avg HR</small>
            <span class="fw-bold">{{avgHeartRate}} bpm</span>
         </div>
      </div>
    </div>
  `,
    styles: [`
    .apollo-card {
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 20px;
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
    }
  `]
})
export class VitalsChartComponent implements OnInit {
    @Input() patientId: number | null = null;
    chart: any;
    vitals: HealthVitals[] = [];
    avgSystolic = 0;
    avgDiastolic = 0;
    avgHeartRate = 0;

    constructor(private vitalsService: VitalsService) { }

    ngOnInit(): void {
        if (this.patientId) {
            this.loadVitals(this.patientId);
        } else {
            // Assume current user if no ID passed (Patient Dashboard)
            this.vitalsService.getMyVitals().subscribe(data => this.processData(data));
        }
    }

    loadVitals(id: number) {
        this.vitalsService.getPatientVitals(id).subscribe(data => this.processData(data));
    }

    processData(data: HealthVitals[]) {
        this.vitals = data.slice(0, 7).reverse(); // Last 7 records, chronological

        // Calculate Avgs
        if (this.vitals.length > 0) {
            this.avgSystolic = Math.round(this.vitals.reduce((acc, v) => acc + (v.systolicBP || 0), 0) / this.vitals.length);
            this.avgDiastolic = Math.round(this.vitals.reduce((acc, v) => acc + (v.diastolicBP || 0), 0) / this.vitals.length);
            this.avgHeartRate = Math.round(this.vitals.reduce((acc, v) => acc + (v.heartRate || 0), 0) / this.vitals.length);
        }

        this.createChart();
    }

    createChart() {
        const ctx = document.getElementById('vitalsChart') as HTMLCanvasElement;
        if (!ctx) return;

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.vitals.map(v => v.recordDate ? new Date(v.recordDate).toLocaleDateString(undefined, { weekday: 'short' }) : ''),
                datasets: [
                    {
                        label: 'Systolic BP',
                        data: this.vitals.map(v => v.systolicBP),
                        borderColor: '#dc3545', // Danger/Red
                        tension: 0.4,
                        pointRadius: 3
                    },
                    {
                        label: 'Diastolic BP',
                        data: this.vitals.map(v => v.diastolicBP),
                        borderColor: '#fd7e14', // Orange
                        tension: 0.4,
                        pointRadius: 3
                    },
                    {
                        label: 'Heart Rate',
                        data: this.vitals.map(v => v.heartRate),
                        borderColor: '#0d6efd', // Primary/Blue
                        tension: 0.4,
                        pointRadius: 3,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: false, grid: { display: false } }, // display: false for grid?
                    x: { grid: { display: false } }
                }
            }
        });
    }
}
