import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PharmacistService } from '../../services/pharmacist.service';
import { PrescriptionService } from '../../services/prescription.service';
import { Prescription } from '../../models/prescription.model';
import { MedicationDetailModalComponent } from '../medication-detail-modal/medication-detail-modal.component';

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-pharmacist-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MedicationDetailModalComponent, RouterModule],
  template: `
    <div class="dashboard-wrapper min-vh-100 pb-5 pt-4">
      <div class="container-fluid px-4 px-lg-5">
        <div class="row mb-4 align-items-center border-bottom border-secondary-subtle pb-3">
          <div class="col">
             <h1 class="m-0 text-dark fw-bold" style="letter-spacing: -0.5px;"><i class="bi bi-bezier2 me-2 text-primary"></i>Dispensing Hub</h1>
             <p class="text-secondary mb-0 mt-1" style="font-size: 0.95rem;">Manage incoming prescription requests directed to you.</p>
          </div>
          <div class="col-auto d-flex gap-2">
             <button class="btn btn-dark rounded-pill px-4 shadow-sm" routerLink="/pharmacist/analytics">
               <i class="bi bi-graph-up-arrow me-2 text-info"></i> View Analytics
             </button>
             <button class="btn btn-outline-dark rounded-pill px-4" (click)="loadQueue()">
               <i class="bi bi-arrow-clockwise me-1"></i> Refresh Queue
             </button>
          </div>
        </div>

    <div *ngIf="error" class="alert alert-danger shadow-sm">{{ error }}</div>

    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2 text-muted">Loading queue...</p>
    </div>

        <!-- Action Required Queue -->
        <h5 class="fw-bold mb-3 text-dark mt-2" style="letter-spacing: -0.3px;">Incoming Requests</h5>
        
        <div *ngIf="incomingRequests.length === 0 && !loading" class="alert alert-light text-center p-5 apollo-card border-0">
           <div class="bg-success-subtle text-success rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 60px; height: 60px;">
              <i class="bi bi-check2-all fs-2"></i>
           </div>
           <h5 class="mt-3 fw-bold text-dark">You're all caught up!</h5>
           <p class="text-secondary mb-0">No pending prescriptions require your immediate attention.</p>
        </div>

        <div class="d-flex flex-column gap-3 mb-5">
          <div *ngFor="let p of incomingRequests" class="apollo-card position-relative overflow-hidden">
              <!-- Glow Effect for Processing -->
              <div *ngIf="p.status === 'PROCEEDED_TO_PHARMACIST'" class="position-absolute top-0 start-0 w-100" style="height: 4px; background: linear-gradient(90deg, #f59e0b, #fbbf24);"></div>
              <div *ngIf="p.status === 'ISSUED'" class="position-absolute top-0 start-0 w-100" style="height: 4px; background: linear-gradient(90deg, #1e3a8a, #3b82f6);"></div>
              
              <!-- Row 1: Header -->
              <div class="d-flex justify-content-between align-items-center mb-0 mt-1 pb-2">
                <div class="d-flex align-items-center gap-3">
                    <h6 class="fw-bold mb-0 text-dark" style="margin: 0; font-size: 1.1rem; letter-spacing: -0.3px;">Prescription #{{ p.id }}</h6>
                    <span class="badge rounded-pill fw-bold" 
                      [ngStyle]="{'background-color': p.status === 'PROCEEDED_TO_PHARMACIST' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(30, 58, 138, 0.1)', 'color': p.status === 'PROCEEDED_TO_PHARMACIST' ? '#d97706' : '#1e3a8a', 'border': p.status === 'PROCEEDED_TO_PHARMACIST' ? '1px solid #fcd34d' : '1px solid #bfdbfe', 'font-size': '0.7rem', 'padding': '0.4em 1em', 'letter-spacing': '0.5px'}">
                      <i class="bi bi-circle-fill me-1" style="font-size: 0.4rem; vertical-align: middle;"></i>
                      {{ p.status === 'PROCEEDED_TO_PHARMACIST' ? 'IN PREPARATION' : 'AWAITING DISPENSING' }}
                    </span>
                </div>
                <button *ngIf="p.filePath" (click)="downloadPdf(p.id!)" class="btn btn-light btn-sm rounded-pill border shadow-sm fw-bold text-secondary px-3" title="Download PDF" style="font-size: 0.75rem;">
                  <i class="bi bi-file-earmark-pdf-fill text-danger me-1"></i> View PDF
                </button>
              </div>

              <!-- Row 2: Identity Grid -->
              <div class="row align-items-center py-3 my-2" style="background: rgba(0,0,0,0.015); border-radius: 8px; border: 1px solid rgba(0,0,0,0.03);">
                <div class="col-6 border-end border-secondary-subtle">
                  <div class="d-flex align-items-center">
                    <div class="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 36px; height: 36px;">
                        <i class="bi bi-person-fill"></i>
                    </div>
                    <div>
                        <small class="text-secondary d-block uppercase-label mb-1">Patient Identity</small>
                        <div class="fw-bold text-dark text-truncate" style="font-size: 0.9rem;">
                            {{ p.patient?.email || p.patientEmail }}
                        </div>
                    </div>
                  </div>
                </div>
                <div class="col-6 ps-4">
                  <div class="d-flex align-items-center">
                    <div class="bg-secondary-subtle text-secondary rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 36px; height: 36px;">
                        <i class="bi bi-hospital-fill"></i>
                    </div>
                    <div>
                        <small class="text-secondary d-block uppercase-label mb-1">Originating Doctor</small>
                        <div class="fw-bold text-dark text-truncate" style="font-size: 0.9rem;">
                            {{ p.doctor?.fullName || 'Dr. Unknown' }}
                        </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Row 3: Medications -->
              <div class="mt-3">
                <small class="text-secondary d-block uppercase-label mb-2 ps-1">Requested Medications</small>
                <div class="table-responsive border rounded-3 overflow-hidden">
                  <table class="table table-hover table-borderless table-sm mb-0 compact-table align-middle">
                    <thead class="text-secondary" style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                      <tr>
                        <th class="ps-3 py-2 fw-bold text-uppercase" style="font-size: 0.7rem; letter-spacing: 0.5px;">Medicine Type</th>
                        <th class="py-2 fw-bold text-uppercase" style="font-size: 0.7rem; letter-spacing: 0.5px;">Dosage</th>
                        <th class="py-2 fw-bold text-uppercase" style="font-size: 0.7rem; letter-spacing: 0.5px;">Quantity</th>
                        <th class="py-2 fw-bold text-uppercase" style="font-size: 0.7rem; letter-spacing: 0.5px;">Instructions</th>
                      </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let item of p.items" class="border-bottom" style="border-color: #f1f5f9 !important;">
                        <td class="ps-3 py-2 fw-bold text-dark">
                          {{ item.medicineName }}
                          <button class="btn btn-sm btn-link text-primary p-0 ms-2 text-decoration-none" style="font-size: 0.75rem;" title="Verify Drug Details" (click)="openInfoModal(item.medicineName)">
                            <i class="bi bi-info-circle-fill"></i> Details
                          </button>
                        </td>
                        <td class="py-2 text-dark fw-medium">{{ item.dosage }}</td>
                        <td class="py-2 text-dark fw-medium">{{ item.quantity }}</td>
                        <td class="py-2"><span class="badge bg-light text-secondary border fw-medium px-2 py-1" style="font-size: 0.75rem;">{{ item.dosageTiming || 'As directed' }}</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Bottom Button Row -->
              <div class="d-flex justify-content-end mt-4 pt-3 border-top border-secondary-subtle">
                 <button *ngIf="p.status === 'ISSUED'" 
                   (click)="accept(p.id!)" class="btn btn-primary px-4 py-2 rounded-pill shadow-sm fw-bold">
                   <i class="bi bi-box-arrow-in-down-right me-2"></i> Accept Request
                 </button>

                 <button *ngIf="p.status === 'PROCEEDED_TO_PHARMACIST' && !p.isDispensed" 
                   (click)="dispense(p.id!)" class="btn btn-success px-4 py-2 rounded-pill shadow-sm fw-bold" style="background: linear-gradient(135deg, #10b981, #059669); border: none;">
                   <i class="bi bi-check2-circle me-2"></i> Dispense Medication
                 </button>
              </div>
          </div>
        </div>

        <!-- Historical Dispensed -->
        <h5 class="fw-bold mb-3 mt-5 text-dark" style="letter-spacing: -0.3px;">Recently Dispensed</h5>
        <div class="d-flex flex-column gap-2 mb-5">
          <div *ngFor="let p of dispensedRequests" class="apollo-card p-3 d-flex justify-content-between align-items-center border-start border-4 shadow-sm" style="border-left-color: #10b981 !important; border-radius: 8px;">
              <div>
                 <h6 class="fw-bold mb-1 text-dark" style="font-size: 0.95rem;">Prescription #{{ p.id }} <span class="badge ms-2 bg-success-subtle text-success border border-success-subtle rounded-pill">Treatment Active</span></h6>
                 <small class="text-secondary fw-medium">Patient: {{ p.patient?.email }} <span class="mx-1">•</span> <i class="bi bi-clock"></i> {{ p.dispensedAt | date:'medium' }}</small>
              </div>
              <button class="btn btn-light rounded-circle border shadow-sm" (click)="downloadPdf(p.id!)"><i class="bi bi-download text-primary"></i></button>
          </div>
          <div *ngIf="dispensedRequests.length === 0" class="text-secondary small text-center py-4">No recently dispensed medications found.</div>
        </div>
      </div>
    </div>

    <!-- Safety Information Modal -->
    <app-medication-detail-modal
        [isOpen]="isModalOpen"
        [drugName]="selectedDrugName"
        viewMode="pharmacist"
        (closeEvent)="closeInfoModal()">
    </app-medication-detail-modal>
  `,
  styles: [`
    .dashboard-wrapper {
      background: linear-gradient(135deg, #f8f9fa 0%, #e2e8f0 100%);
    }
    .apollo-card {
      background: rgba(255, 255, 255, 0.85);
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
      border: 1px solid rgba(255,255,255,1);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      padding: 18px 24px;
    }
    .apollo-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 15px 35px rgba(0,0,0,0.08);
        background: rgba(255, 255, 255, 0.95);
    }
    .uppercase-label {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-weight: 700;
    }
    .compact-table th {
      color: #64748b !important;
    }
    .compact-table td {
      font-size: 0.85rem;
    }
    .glass-tabs {
      background: rgba(255, 255, 255, 0.4);
      backdrop-filter: blur(20px);
      border-radius: 50px;
      display: inline-flex;
      border: 1px solid rgba(255, 255, 255, 0.6);
      padding: 6px;
      box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15);
    }
    .tab-btn {
      padding: 12px 32px;
      border-radius: 50px;
      border: none;
      background: transparent;
      color: #1e293b;
      font-weight: 700;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.95rem;
    }
    .tab-btn.active {
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      color: white;
      box-shadow: 0 10px 20px rgba(37, 99, 235, 0.3);
      transform: scale(1.05);
    }
    .btn-primary-glass {
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      color: white;
      border: none;
      padding: 10px 24px;
      border-radius: 50px;
      font-weight: 700;
      box-shadow: 0 4px 15px rgba(37, 99, 235, 0.2);
      transition: all 0.3s ease;
    }
    .btn-primary-glass:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.3);
    }
    .animate-fade {
      animation: fadeIn 0.4s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class PharmacistDashboardComponent implements OnInit {
  incomingRequests: Prescription[] = [];
  dispensedRequests: Prescription[] = [];
  error: string | null = null;
  loading: boolean = true;

  // Modal State
  isModalOpen = false;
  selectedDrugName = '';

  constructor(
    private pharmacistService: PharmacistService,
    private prescriptionService: PrescriptionService
  ) { }

  ngOnInit(): void {
    this.loadQueue();
  }

  loadQueue() {
    this.loading = true;
    this.error = null;
    this.prescriptionService.getPharmacistQueue().subscribe({
      next: (data) => {
        this.incomingRequests = data.filter(p => p.status === 'ISSUED' || p.status === 'PROCEEDED_TO_PHARMACIST');
        // Sort processing to the top
        this.incomingRequests.sort((a, b) => (b.id || 0) - (a.id || 0));

        this.dispensedRequests = data.filter(p => p.status === 'DISPENSED');
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load queue. Please try again.';
        this.loading = false;
      }
    });
  }

  accept(id: number) {
    this.pharmacistService.acceptPrescription(id).subscribe({
      next: () => {
        this.loadQueue();
      },
      error: (err) => alert('Failed to accept: ' + (err.error || 'Unknown error'))
    });
  }

  dispense(id: number) {
    this.pharmacistService.dispensePrescription(id).subscribe({
      next: () => {
        this.loadQueue();
      },
      error: (err) => alert('Failed to dispense: ' + (err.error || 'Unknown error'))
    });
  }

  downloadPdf(id: number) {
    this.pharmacistService.downloadPrescription(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Prescription-${id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => alert('Failed to download PDF')
    });
  }

  openInfoModal(drugName: string): void {
      this.selectedDrugName = drugName;
      this.isModalOpen = true;
  }

  closeInfoModal(): void {
      this.isModalOpen = false;
      this.selectedDrugName = '';
  }
}
