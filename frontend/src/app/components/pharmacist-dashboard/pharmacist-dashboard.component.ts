import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PharmacistService } from '../../services/pharmacist.service';
import { PrescriptionService } from '../../services/prescription.service';
import { Prescription } from '../../models/prescription.model';

@Component({
  selector: 'app-pharmacist-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container py-5">
      <div class="row mb-4 align-items-center border-bottom pb-3">
        <div class="col">
           <h1 class="h1-medical m-0 text-primary fw-bold"><i class="bi bi-inboxes-fill me-2"></i> Dispensing Hub</h1>
           <p class="text-muted mb-0 mt-2">Manage incoming prescription requests directed to you.</p>
        </div>
        <div class="col-auto">
           <button class="btn btn-outline-primary" (click)="loadQueue()">
             <i class="bi bi-arrow-clockwise me-1"></i> Refresh Queue
           </button>
        </div>
      </div>

      <div *ngIf="error" class="alert alert-danger shadow-sm">{{ error }}</div>

      <!-- Action Required Queue -->
      <h3 class="fw-bold mb-4 text-secondary">Incoming Requests</h3>
      
      <div *ngIf="incomingRequests.length === 0 && !loading" class="alert alert-light text-center p-5 apollo-card">
         <i class="bi bi-check-circle-fill text-success" style="font-size: 3rem;"></i>
         <h4 class="mt-3">You're all caught up!</h4>
         <p class="text-muted">No pending prescriptions require your immediate attention.</p>
      </div>

      <div class="d-flex flex-column gap-4 mb-5">
        <div *ngFor="let p of incomingRequests" class="apollo-card p-4 position-relative overflow-hidden">
            <!-- Glow Effect for Processing -->
            <div *ngIf="p.status === 'PROCEEDED_TO_PHARMACIST'" class="position-absolute top-0 start-0 w-100" style="height: 4px; background: #f59e0b; box-shadow: 0 0 15px #f59e0b;"></div>
            <div *ngIf="p.status === 'ISSUED'" class="position-absolute top-0 start-0 w-100" style="height: 4px; background: #1e3a8a;"></div>
            
            <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
              <h5 class="fw-bold mb-0" style="color: #1e3a8a;">Prescription #{{ p.id }}</h5>
              <span class="badge rounded-pill fw-bold" 
                [ngStyle]="{
                  'background-color': p.status === 'PROCEEDED_TO_PHARMACIST' ? '#f59e0b' : '#1e3a8a',
                  'color': 'white',
                  'font-size': '0.8rem',
                  'padding': '0.5em 1em'
                }">
                {{ p.status === 'PROCEEDED_TO_PHARMACIST' ? 'IN PREPARATION' : 'AWAITING PHARMACY' }}
              </span>
            </div>

            <div class="row mb-4">
              <div class="col-md-5">
                <small class="text-muted d-block text-uppercase fw-bold" style="letter-spacing: 0.5px; font-size: 0.75rem;">Patient Identity</small>
                <div class="fw-bold d-flex align-items-center mt-1">
                    <i class="bi bi-person-badge fs-5 me-2 text-primary"></i>
                    {{ p.patient?.email || p.patientEmail }}
                </div>
              </div>
              <div class="col-md-5">
                <small class="text-muted d-block text-uppercase fw-bold" style="letter-spacing: 0.5px; font-size: 0.75rem;">Originating Doctor</small>
                <div class="fw-bold d-flex align-items-center mt-1">
                    <i class="bi bi-hospital fs-5 me-2 text-primary"></i>
                    {{ p.doctor?.fullName || 'Dr. Unknown' }}
                </div>
              </div>
              <div class="col-md-2 text-end">
                  <button *ngIf="p.filePath" (click)="downloadPdf(p.id!)" class="btn btn-outline-secondary btn-sm" title="Download PDF">
                    <i class="bi bi-file-earmark-pdf"></i> View PDF
                  </button>
              </div>
            </div>

            <h6 class="text-uppercase text-secondary small fw-bold mb-3 border-bottom pb-2">Requested Medications</h6>
            <div class="table-responsive mb-4">
              <table class="table table-borderless table-sm mb-0">
                <thead class="bg-light rounded text-muted">
                  <tr>
                    <th class="ps-3 py-2">Medicine Type</th>
                    <th class="py-2">Dosage</th>
                    <th class="py-2">Quantity</th>
                    <th class="py-2">Instructions</th>
                  </tr>
                </thead>
                <tbody>
                    <tr *ngFor="let item of p.items" class="border-bottom border-light">
                    <td class="ps-3 py-2 fw-semibold">{{ item.medicineName }}</td>
                    <td class="py-2">{{ item.dosage }}</td>
                    <td class="py-2">{{ item.quantity }}</td>
                    <td class="py-2"><span class="badge bg-light text-dark fw-normal border">{{ item.dosageTiming || 'As directed' }}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="d-flex justify-content-end align-items-center p-3 rounded-3 mt-3" style="background: rgba(30, 58, 138, 0.03);">
               <button *ngIf="p.status === 'ISSUED'" 
                 (click)="accept(p.id!)" class="btn btn-lg px-4 rounded-pill shadow-sm text-white" style="background-color: #1e3a8a;">
                 <i class="bi bi-hand-thumbs-up me-2"></i> Accept Request
               </button>

               <button *ngIf="p.status === 'PROCEEDED_TO_PHARMACIST' && !p.isDispensed" 
                 (click)="dispense(p.id!)" class="btn btn-lg px-4 rounded-pill shadow-sm text-white border-0" style="background-color: #10b981; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3) !important;">
                 <i class="bi bi-check2-circle me-2"></i> Dispense Medication
               </button>
            </div>
        </div>
      </div>

      <!-- Historical Dispensed -->
      <h4 class="fw-bold mb-4 mt-5 text-secondary border-bottom pb-2">Recently Dispensed</h4>
      <div class="d-flex flex-column gap-3">
        <div *ngFor="let p of dispensedRequests" class="apollo-card p-3 d-flex justify-content-between align-items-center opacity-75 border-start border-4" style="border-color: #10b981 !important;">
            <div>
               <h6 class="fw-bold mb-1" style="color: #1e3a8a;">Prescription #{{ p.id }} <span class="badge ms-2" style="background-color: #10b981;">TREATMENT ACTIVE</span></h6>
               <small class="text-muted">For {{ p.patient?.email }} | Dispensed on {{ p.dispensedAt | date:'medium' }}</small>
            </div>
            <button class="btn btn-sm btn-outline-secondary" (click)="downloadPdf(p.id!)"><i class="bi bi-download"></i></button>
        </div>
        <div *ngIf="dispensedRequests.length === 0" class="text-muted small text-center py-4">No recently dispensed medications found.</div>
      </div>

    </div>
  `,
  styles: [`
    .apollo-card {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.06);
      border: 1px solid rgba(255,255,255,0.4);
      backdrop-filter: blur(10px);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .apollo-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 40px rgba(0,0,0,0.08);
    }
    .table-sm th, .table-sm td {
        font-size: 0.9rem;
    }
  `]
})
export class PharmacistDashboardComponent implements OnInit {
  incomingRequests: Prescription[] = [];
  dispensedRequests: Prescription[] = [];
  error: string | null = null;
  loading: boolean = true;

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
        this.incomingRequests.sort((a, b) => {
          if (a.status === 'PROCEEDED_TO_PHARMACIST' && b.status !== 'PROCEEDED_TO_PHARMACIST') return -1;
          if (a.status !== 'PROCEEDED_TO_PHARMACIST' && b.status === 'PROCEEDED_TO_PHARMACIST') return 1;
          return 0;
        });

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
}
