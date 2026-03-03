import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin.service';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="d-flex vh-100 bg-apollo font-inter">
      <!-- Admin Sidebar -->
      <nav class="sidebar d-flex flex-column p-4">
        <div class="sidebar-brand mb-4">
          <h4 class="fw-bold m-0 text-white">MedTrack Admin</h4>
        </div>
        
        <ul class="nav flex-column mb-auto">
          <li class="nav-item mb-2">
            <a routerLink="/admin" class="nav-link text-white rounded-3 shadow-sm" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
              <i class="bi bi-grid-1x2-fill me-2"></i> Dashboard
            </a>
          </li>
          <li class="nav-item mb-2">
            <a routerLink="/admin/verification" class="nav-link text-white rounded-3 shadow-sm" routerLinkActive="active">
              <i class="bi bi-shield-check me-2"></i> Verification Queue
            </a>
          </li>
          <li class="nav-item mb-2">
            <a routerLink="/admin/audit-trace" class="nav-link text-white rounded-3 shadow-sm" routerLinkActive="active">
              <i class="bi bi-clock-history me-2"></i> Audit Trace
            </a>
          </li>
          <li class="nav-item mb-2">
            <a routerLink="/admin/patient-history" class="nav-link text-white rounded-3 shadow-sm" routerLinkActive="active">
              <i class="bi bi-person-lines-fill me-2"></i> Patient History
            </a>
          </li>
          <li class="nav-item mb-2">
            <a href="#" class="nav-link text-white rounded-3 shadow-sm">
              <i class="bi bi-journal-text me-2"></i> Audit Logs
            </a>
          </li>
        </ul>
        
        <div class="sidebar-footer pt-3 mt-3 border-top border-secondary">
          <div class="d-flex align-items-center">
            <div class="avatar bg-primary text-white rounded-circle me-2">A</div>
            <div class="admin-info">
              <div class="fw-bold text-white small">System Admin</div>
              <div class="text-white-50 x-small">admin&#64;medtrack.com</div>
            </div>
          </div>
        </div>
      </nav>

      <!-- Main Content -->
      <div class="flex-grow-1 overflow-auto p-5">
        <div class="container-fluid">
          <header class="mb-5 d-flex justify-content-between align-items-end">
            <div>
              <h2 class="fw-bold text-dark m-0">System Intelligence</h2>
              <p class="text-muted">High-level operational metrics and system health.</p>
            </div>
            <div class="d-flex gap-2">
              <div class="input-group input-group-sm" style="width: 250px;">
                <span class="input-group-text bg-white border-end-0"><i class="bi bi-search"></i></span>
                <input type="text" class="form-control border-start-0" placeholder="Audit Prescription ID..." 
                  [(ngModel)]="searchId" (keyup.enter)="loadPrescriptionAudit(searchId)">
                <button class="btn btn-primary" (click)="loadPrescriptionAudit(searchId)">Trace</button>
              </div>
              <div class="badge bg-light text-dark p-2 border rounded-pill small d-flex align-items-center">
                <i class="bi bi-calendar3 me-2"></i> Live Data Sync Active
              </div>
            </div>
          </header>

          <!-- Analytics Cards -->
          <div class="row g-4 mb-5" *ngIf="stats">
            <div class="col-md-4">
              <div class="glass-card p-4">
                <h6 class="text-uppercase text-secondary small fw-bold mb-3">Total Scale</h6>
                <div class="d-flex align-items-baseline">
                   <div class="display-5 fw-bold text-primary me-2">{{ stats.totalPatients + stats.totalDoctors + stats.totalPharmacists }}</div>
                   <div class="text-muted small">Total Users</div>
                </div>
                <div class="mt-3 progress" style="height: 6px;">
                  <div class="progress-bar bg-primary" [style.width]="'70%'"></div>
                </div>
              </div>
            </div>
            
            <div class="col-md-4">
              <div class="glass-card p-4">
                <h6 class="text-uppercase text-secondary small fw-bold mb-3">Dispensing Velocity</h6>
                <div class="d-flex align-items-baseline">
                   <div class="display-5 fw-bold text-success me-2">{{ stats.dispensingRate | number:'1.1-1' }}%</div>
                   <div class="text-muted small">Efficiency</div>
                </div>
                <div class="mt-3 text-success small fw-semibold">
                  <i class="bi bi-graph-up me-1"></i> +2.4% from last week
                </div>
              </div>
            </div>

            <div class="col-md-4">
              <div class="glass-card p-4">
                <h6 class="text-uppercase text-secondary small fw-bold mb-3">System Integrity</h6>
                <div class="display-5 fw-bold text-info">99.9%</div>
                <div class="mt-3 text-muted small d-flex align-items-center">
                  <span class="status-dot online me-2"></span> Active Node: Backend-Main
                </div>
              </div>
            </div>
          </div>

          <!-- Advanced Charts Section -->
          <div class="row g-4 mb-5">
            <div class="col-lg-8">
              <div class="glass-card p-4 h-100">
                <h5 class="fw-bold mb-4">Pharmacist Fulfillment Performance</h5>
                <div class="chart-container" style="position: relative; height: 350px;">
                  <canvas #fulfillmentChart></canvas>
                </div>
              </div>
            </div>
            <div class="col-lg-4">
              <div class="glass-card p-4 h-100">
                <h5 class="fw-bold mb-4">Global Adherence</h5>
                <div class="chart-container" style="position: relative; height: 350px;">
                  <canvas #adherenceChart></canvas>
                </div>
              </div>
            </div>
          </div>

          <!-- Prescription Journey Audit (Conditional) -->
          <div class="row g-4 mb-5" *ngIf="selectedPrescriptionId">
            <div class="col-12">
              <div class="glass-card p-5">
                <div class="d-flex justify-content-between align-items-center mb-5">
                  <h4 class="fw-bold m-0 text-indigo">
                    <i class="bi bi-diagram-3-fill me-2"></i> Legacy Ledger: Prescription #{{ selectedPrescriptionId }}
                  </h4>
                  <button class="btn btn-link text-muted p-0" (click)="selectedPrescriptionId = null">
                    <i class="bi bi-x-lg me-1"></i> Close Journey
                  </button>
                </div>

                <div class="timeline-container px-4">
                  <div class="timeline-item mb-5 d-flex" *ngFor="let step of prescriptionHistory; let i = index">
                    <div class="timeline-marker me-4 d-flex flex-column align-items-center">
                      <div class="marker-circle" [ngClass]="{
                        'bg-success': step.actionType === 'DISPENSED',
                        'bg-warning': step.actionType === 'PROCEEDED_TO_PHARMACIST',
                        'bg-primary': step.actionType === 'ISSUED'
                      }">{{ prescriptionHistory.length - i }}</div>
                      <div class="marker-line" *ngIf="i < prescriptionHistory.length - 1"></div>
                    </div>
                    <div class="timeline-content glass-card p-4 flex-grow-1 border-start-4" [ngStyle]="{
                      'border-left': '4px solid ' + (step.actionType === 'DISPENSED' ? '#10b981' : step.actionType === 'ISSUED' ? '#1e3a8a' : '#f59e0b')
                    }">
                      <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="fw-bold m-0">{{ step.version }} - {{ step.actionType }}</h6>
                        <span class="badge bg-light text-secondary">{{ step.modifiedAt | date:'medium' }}</span>
                      </div>
                      <div class="text-muted small mb-3">Modified By: <span class="text-dark fw-semibold">{{ step.modifiedBy }}</span></div>
                      
                      <div class="audit-snapshot bg-dark bg-opacity-10 p-3 rounded-3 font-mono x-small">
                        <div *ngIf="parseAuditData(step.auditData) as data">
                          <div class="row">
                            <div class="col-md-4"><strong>Status:</strong> {{ data.status }}</div>
                            <div class="col-md-4"><strong>Doctor:</strong> {{ data.doctor }}</div>
                            <div class="col-md-4"><strong>Patient:</strong> {{ data.patient }}</div>
                          </div>
                          <div class="mt-2 border-top pt-2 opacity-75">
                            <strong>Meds:</strong> 
                            <span *ngFor="let item of data.items; let last = last">
                              {{ item.name }} ({{ item.qty }}){{ !last ? ', ' : '' }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Global Audit Section -->
          <div class="glass-card overflow-hidden" [hidden]="selectedPrescriptionId">
            <div class="card-header bg-transparent border-0 p-4 pb-0 d-flex justify-content-between align-items-center">
               <h5 class="fw-bold m-0">System Security Audit Trail</h5>
               <button class="btn btn-sm btn-outline-primary rounded-pill px-3" (click)="loadInitialData()">Refresh Stream</button>
            </div>
            <div class="card-body p-0">
               <div class="table-responsive">
                 <table class="table table-hover align-middle mb-0 custom-table">
                   <thead>
                     <tr>
                       <th class="ps-4">Action</th>
                       <th>Target/Details</th>
                       <th>Timestamp</th>
                       <th class="pe-4">Metadata</th>
                     </tr>
                   </thead>
                   <tbody>
                     <tr *ngFor="let audit of systemAudits">
                       <td class="ps-4">
                         <span class="badge bg-soft-info text-info rounded-pill px-3 fw-bold">{{ audit.action }}</span>
                       </td>
                       <td>
                         <div class="text-dark fw-medium small">{{ audit.details }}</div>
                       </td>
                       <td><span class="text-secondary small">{{ audit.timestamp | date:'medium' }}</span></td>
                       <td class="pe-4 text-muted small">Admin Root</td>
                     </tr>
                     <tr *ngIf="systemAudits.length === 0">
                       <td colspan="4" class="text-center py-5 text-muted">
                         <i class="bi bi-shield-slash display-4 d-block mb-3 opacity-25"></i>
                         No audit logs found.
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
    .font-inter { font-family: 'Inter', sans-serif; }
    .bg-apollo { background: #f8fafc; }
    .x-small { font-size: 0.7rem; }
    
    .sidebar {
      width: 280px;
      background: #1e1b4b; /* Dark Navy for Admin */
      min-height: 100vh;
    }
    
    .nav-link {
      color: rgba(255,255,255,0.7) !important;
      padding: 0.8rem 1.2rem;
      transition: all 0.3s;
    }
    
    .nav-link:hover, .nav-link.active {
      color: white !important;
      background: rgba(255,255,255,0.1) !important;
    }
    
    .glass-card {
      background: white;
      border: 1px solid rgba(0,0,0,0.05);
      border-radius: 20px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    }
    
    .avatar {
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 0.9rem;
    }
    
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    
    .status-dot.online {
      background: #10b981;
      box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.2);
    }
    
    .custom-table thead th {
      background: #f1f5f9;
      color: #64748b;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 1rem 1.5rem;
      border: none;
    }
    
    .custom-table tbody td {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .bg-soft-info { background: #e0f2fe; }
    .bg-soft-primary { background: #e0e7ff; }
    
    .timeline-container { position: relative; }
    .marker-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      z-index: 2;
    }
    .marker-line {
      width: 2px;
      flex-grow: 1;
      background: #e2e8f0;
      margin-top: 4px;
    }
    .text-indigo { color: #4338ca; }
    .font-mono { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }
    .border-start-4 { border-left-width: 4px !important; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  @ViewChild('fulfillmentChart') fulfillmentCanvas!: ElementRef;
  @ViewChild('adherenceChart') adherenceCanvas!: ElementRef;

  stats: any = null;
  systemAudits: any[] = [];

  selectedPrescriptionId: number | null = null;
  prescriptionHistory: any[] = [];
  searchId: string = '';

  private chartFulfillment: any;
  private chartAdherence: any;

  constructor(private adminService: AdminService) { }

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.adminService.getStats().subscribe(data => {
      this.stats = data;
      setTimeout(() => this.initCharts(), 500);
    });

    this.adminService.getSystemAudits().subscribe(data => {
      this.systemAudits = data;
    });
  }

  loadPrescriptionAudit(id: any) {
    if (!id) return;
    this.adminService.getPrescriptionAuditLogs(+id).subscribe({
      next: (data) => {
        this.prescriptionHistory = data;
        this.selectedPrescriptionId = +id;
      },
      error: (err) => console.error('Failed to trace Rx journey', err)
    });
  }

  parseAuditData(data: string) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }

  private initCharts() {
    if (!this.stats) return;

    // Fulfillment Chart (Bar)
    if (this.fulfillmentCanvas) {
      const perfData = this.stats.pharmacistPerformance || {};
      const labels = Object.keys(perfData);
      const values = Object.values(perfData);

      this.chartFulfillment = new Chart(this.fulfillmentCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: labels.length ? labels : ['No Data'],
          datasets: [{
            label: 'Avg Hours to Dispense',
            data: values.length ? values : [0],
            backgroundColor: '#1e3a8a',
            borderRadius: 8,
            barThickness: 40
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { display: false }, title: { display: true, text: 'Hours' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // Adherence Chart (Doughnut)
    if (this.adherenceCanvas) {
      const adherenceData = this.stats.globalAdherence || {};

      this.chartAdherence = new Chart(this.adherenceCanvas.nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['Successful', 'Missed'],
          datasets: [{
            data: [adherenceData.Success || 0, adherenceData.Missed || 0],
            backgroundColor: ['#10b981', '#ef4444'],
            borderWidth: 0,
            hoverOffset: 10
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, padding: 25, font: { family: 'Inter', size: 12 } } }
          },
          cutout: '70%'
        }
      });
    }
  }
}
