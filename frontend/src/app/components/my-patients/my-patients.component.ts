import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DoctorService, PatientRisk } from '../../services/doctor.service';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';

@Component({
    selector: 'app-my-patients',
    standalone: true,
    imports: [CommonModule, RouterModule, BaseChartDirective],
    providers: [provideCharts(withDefaultRegisterables())],
    template: `
    <div class="container-fluid py-5 px-lg-5 bg-doctors-slate min-vh-100 position-relative">
      <!-- Loading Overlay -->
      <div *ngIf="loading" class="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75" style="z-index: 1000;">
        <div class="text-center">
          <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;" role="status"></div>
          <h5 class="fw-bold text-dark">Analyzing Patient Data...</h5>
        </div>
      </div>

      <!-- HEADER & INSIGHTS CHART -->
      <div class="row g-4 mb-5" *ngIf="!loading">
        <div class="col-lg-7">
          <div class="glass-card p-5 h-100 d-flex flex-column">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h2 class="fw-bold m-0" style="letter-spacing: -1px;">Clinical Intelligence</h2>
                <p class="text-muted small">Workload (rx) vs. Therapeutic Success (adherence)</p>
              </div>
              <div class="chart-legend d-flex gap-3 small fw-bold">
                 <span class="text-primary"><i class="bi bi-circle-fill me-1" style="font-size: 0.6rem;"></i> Workload</span>
                 <span class="text-success"><i class="bi bi-circle-fill me-1" style="font-size: 0.6rem;"></i> Adherence</span>
              </div>
            </div>
            <div class="chart-container flex-grow-1" style="min-height: 250px; position: relative;" *ngIf="patients.length > 0">
               <canvas baseChart
                  [data]="barChartData"
                  [options]="barChartOptions"
                  [type]="'bar'">
               </canvas>
            </div>
            <!-- Empty State for Chart -->
            <div *ngIf="patients.length === 0" class="flex-grow-1 d-flex align-items-center justify-content-center text-muted flex-column py-4">
                <i class="bi bi-bar-chart fs-1 opacity-25 mb-2"></i>
                <p class="small">No patient population data available for matrix.</p>
            </div>
          </div>
        </div>
        <div class="col-lg-5">
          <div class="glass-card p-5 h-100 d-flex flex-column justify-content-center">
             <div class="d-flex align-items-center mb-4">
                <div class="icon-box bg-danger-subtle text-danger rounded-4 p-3 me-3">
                   <i class="bi bi-shield-exclamation fs-3"></i>
                </div>
                <div>
                   <h4 class="fw-bold m-0">Critical Triage</h4>
                   <p class="text-muted small m-0">System identified priority interventions</p>
                </div>
             </div>
             <div class="kpi-stat mb-4">
                <h1 class="display-3 fw-bold text-danger m-0">{{ getHighRiskCount() }}</h1>
                <div class="fw-bold text-uppercase small tracking-wider text-secondary">Critical Interventions Required</div>
             </div>
             <button class="btn btn-danger w-100 py-3 rounded-4 fw-bold shadow-sm" (click)="scrollToRegistry()">
                Launch Risk Intervention Registry
             </button>
          </div>
        </div>
      </div>

      <div class="d-flex justify-content-between align-items-center mb-4" id="risk-registry">
        <h3 class="fw-bold m-0">Risk Registry</h3>
        <div class="btn-group shadow-sm">
            <button class="btn btn-white px-3 py-2 border active small fw-bold">Risk Level</button>
            <button class="btn btn-white px-3 py-2 border small fw-bold">Name</button>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-md-12">
            <div class="glass-card overflow-hidden border-0">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0 clinical-table">
                            <thead>
                                <tr>
                                    <th class="ps-5 py-4 border-0">Patient Identity</th>
                                    <th class="py-4 border-0 text-center">Risk Tier</th>
                                    <th class="py-4 border-0 text-center">Workload</th>
                                    <th class="py-4 border-0 text-center">Adherence Index</th>
                                    <th class="py-4 border-0 text-center">Missed Cycles</th>
                                    <th class="pe-5 py-4 border-0 text-end">Clinical Detail</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr *ngFor="let p of patients" [class.warning-red-glow]="p.adherenceScore < 50">
                                    <td class="ps-5 py-4">
                                        <div class="d-flex align-items-center">
                                            <div class="avatar-box text-white me-3 d-flex align-items-center justify-content-center shadow-sm"
                                                [ngClass]="{'bg-danger': p.riskLevel === 'HIGH', 'bg-warning': p.riskLevel === 'MEDIUM', 'bg-success': p.riskLevel === 'LOW'}"
                                                style="width: 48px; height: 48px; border-radius: 14px; font-weight: 800;">
                                                {{ p.patientName.charAt(0) }}
                                            </div>
                                            <div>
                                                <div class="fw-bold text-dark fs-6">{{ p.patientName }}</div>
                                                <div class="text-secondary x-small fw-bold text-uppercase">Citizen ID: {{ p.patientId }}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="py-4 text-center">
                                        <span class="badge px-3 py-2 rounded-pill fw-bold" 
                                            [ngClass]="{'bg-danger-subtle text-danger': p.riskLevel === 'HIGH', 'bg-warning-subtle text-warning-dark': p.riskLevel === 'MEDIUM', 'bg-success-subtle text-success': p.riskLevel === 'LOW'}">
                                            {{ p.riskLevel }}
                                        </span>
                                    </td>
                                    <td class="py-4 text-center fw-bold text-dark">
                                        {{ p.prescriptionCount }} Rx
                                    </td>
                                     <td class="py-4 text-center">
                                        <div *ngIf="p.hasWorkload" class="d-flex align-items-center justify-content-center flex-column gap-1" style="min-width: 120px;">
                                            <div class="progress w-100 rounded-pill" style="height: 8px; background: rgba(0,0,0,0.05);">
                                                <div class="progress-bar rounded-pill" 
                                                    [ngClass]="{'bg-danger': p.adherenceScore < 50, 'bg-warning': p.adherenceScore >= 50 && p.adherenceScore < 80, 'bg-success': p.adherenceScore >= 80}"
                                                    [style.width]="p.adherenceScore + '%'"></div>
                                            </div>
                                            <small class="fw-bold text-secondary">{{ p.adherenceScore }}%</small>
                                        </div>
                                        <div *ngIf="!p.hasWorkload" class="text-muted small italic">
                                            No workload
                                        </div>
                                    </td>
                                    <td class="py-4 text-center text-danger fw-bold fs-5">
                                        {{ p.missedDoses > 0 ? p.missedDoses : '-' }}
                                    </td>
                                    <td class="pe-5 py-4 text-end">
                                        <a [routerLink]="['/doctor/patients', p.patientId]" class="btn btn-dark rounded-4 px-4 py-2 fw-bold small">
                                            View Profile
                                        </a>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .bg-doctors-slate { background: #f1f5f9; }
    .glass-card {
        background: rgba(255, 255, 255, 0.85);
        border: 1px solid rgba(255,255,255,1);
        border-radius: 28px;
        box-shadow: 0 15px 35px rgba(0,0,0,0.03);
        backdrop-filter: blur(20px);
    }
    .clinical-table thead th {
        background: transparent;
        color: #64748b;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 800;
    }
    .text-warning-dark { color: #92400e; }
    .x-small { font-size: 0.7rem; }
    
    .warning-red-glow {
        animation: glow 2s infinite alternate;
        background: rgba(239, 68, 68, 0.03) !important;
    }
    
    @keyframes glow {
        from { box-shadow: inset 0 0 10px rgba(239, 68, 68, 0.1); }
        to { box-shadow: inset 0 0 30px rgba(239, 68, 68, 0.2); }
    }
  `]
})
export class MyPatientsComponent implements OnInit {
    @ViewChild('insightsChart') insightsCanvas!: ElementRef;
    
    patients: PatientRisk[] = [];
    loading = true;

    public barChartOptions: ChartOptions<'bar'> = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, max: 100, grid: { display: false } },
        x: { grid: { display: false } }
      }
    };

    public barChartData: ChartConfiguration<'bar'>['data'] = {
      labels: [],
      datasets: []
    };

    constructor(private doctorService: DoctorService) { }

    ngOnInit(): void {
        this.doctorService.getPatientsByRisk().subscribe({
            next: (data) => {
                this.patients = data;
                console.log('Successfully loaded patients:', this.patients.length);
                this.loading = false;
                setTimeout(() => {
                  console.log('Attempting to initialize chart...');
                  this.initChart();
                }, 800);
            },
            error: (err) => {
                console.error('Failed to load patients', err);
                this.loading = false;
            }
        });
    }

    getHighRiskCount(): number {
        return this.patients.filter(p => p.hasWorkload && p.adherenceScore < 50).length;
    }

    scrollToRegistry() {
        document.getElementById('risk-registry')?.scrollIntoView({ behavior: 'smooth' });
    }

    private initChart() {
        if (this.patients.length === 0) {
          console.warn('Cannot init chart: patients list is empty');
          return;
        }

        // Get top 6 patients WITH actual workload for the chart
        const topPatients = [...this.patients]
          .filter(p => p.hasWorkload)
          .sort((a, b) => b.adherenceScore - a.adherenceScore)
          .slice(0, 6);
        
        const labels = topPatients.map(p => p.patientName);
        const workloadData = topPatients.map(p => p.prescriptionCount);
        const successData = topPatients.map(p => p.adherenceScore);

        this.barChartData = {
            labels: labels,
            datasets: [
                {
                    label: 'Workload (Rx)',
                    data: workloadData,
                    backgroundColor: '#3b82f6',
                    borderRadius: 8,
                    barThickness: 20
                },
                {
                    label: 'Adherence (%)',
                    data: successData,
                    backgroundColor: '#10b981',
                    borderRadius: 8,
                    barThickness: 20
                }
            ]
        };
    }
}
