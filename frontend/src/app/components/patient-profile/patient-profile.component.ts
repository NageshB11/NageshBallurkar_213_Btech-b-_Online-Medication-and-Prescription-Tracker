import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { PrescriptionService } from '../../services/prescription.service';
import { AdherenceService } from '../../services/adherence.service';
import { Prescription } from '../../models/prescription.model';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container py-5">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-5">
        <div>
          <a routerLink="/patients" class="text-decoration-none text-secondary mb-2 d-inline-block">
            <i class="bi bi-arrow-left me-1"></i> Back to Patients
          </a>
          <h2 class="fw-bold text-dark mb-0">Patient Profile</h2>
        </div>
        <button (click)="issuePrescription()" class="btn btn-apollo-primary">
          <i class="bi bi-plus-lg me-2"></i> Issue Prescription
        </button>
      </div>

      <div class="row g-4">
        <!-- Patient Info Card -->
        <div class="col-md-4">
          <div class="apollo-card p-4 h-100">
            <div class="text-center mb-4">
              <div class="avatar-xl rounded-circle bg-primary-subtle text-primary fw-bold mx-auto mb-3 d-flex align-items-center justify-content-center" style="width: 80px; height: 80px; font-size: 2rem;">
                {{patientName?.charAt(0) || '?'}}
              </div>
              <h4 class="fw-bold mb-1">{{patientName || 'Unknown'}}</h4>
              <p class="text-muted">{{patientEmail}}</p>
            </div>
            
            <hr class="my-4 op-10">
            
            <h6 class="text-uppercase text-secondary small fw-bold mb-3">Quick Actions</h6>
            <div class="d-grid gap-2">
              <button class="btn btn-light text-start border"><i class="bi bi-envelope me-2"></i> Send Message</button>
              <button class="btn btn-light text-start border"><i class="bi bi-calendar-event me-2"></i> Schedule Appointment</button>
            </div>
          </div>
          
          <!-- Adherence Card -->
          <div class="apollo-card p-4 mt-4 text-center">
            <h6 class="text-uppercase text-secondary small fw-bold mb-3">Adherence Score</h6>
            <div class="position-relative d-inline-block">
                <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" stroke-width="12" />
                    <circle cx="60" cy="60" r="54" fill="none" stroke="var(--primary-color, #0d6efd)" stroke-width="12"
                            [attr.stroke-dasharray]="dashArray" 
                            [attr.stroke-dashoffset]="dashOffset" 
                            style="transition: stroke-dashoffset 1s ease-in-out;"
                            transform="rotate(-90 60 60)" />
                </svg>
                <div class="position-absolute top-50 start-50 translate-middle">
                    <h3 class="fw-bold mb-0">{{adherenceScore}}%</h3>
                </div>
            </div>
            <p class="small text-muted mt-2">Overall Patient Adherence</p>
          </div>
        </div>

        <!-- Prescription History -->
        <div class="col-md-8">
          <div class="apollo-card p-4 h-100">
            <h5 class="fw-bold mb-4">Prescription History</h5>
            
            <div *ngIf="loading" class="text-center py-5">
              <div class="spinner-border text-primary" role="status"></div>
            </div>

            <div *ngIf="!loading && prescriptions.length === 0" class="text-center py-5 text-muted">
              <i class="bi bi-clipboard-x fs-1 d-block mb-2"></i>
              No prescriptions found for this patient.
            </div>

            <div *ngIf="prescriptions.length > 0" class="timeline">
              <div *ngFor="let p of prescriptions" class="timeline-item pb-4 border-start border-2 ps-4 position-relative">
                <div class="position-absolute top-0 start-0 translate-middle bg-white p-1" style="margin-top: 5px;">
                  <i class="bi bi-check-circle-fill text-success fs-5" *ngIf="p.status === 'DISPENSED'"></i>
                  <i class="bi bi-check-circle-fill text-primary fs-5" *ngIf="p.status === 'ISSUED'"></i>
                  <i class="bi bi-clock-fill text-warning fs-5" *ngIf="p.status === 'PENDING'"></i>
                </div>
                
                <div class="card border mb-2 shadow-sm">
                  <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                       <div>
                         <span class="badge" 
                            [class.bg-success-subtle]="p.status === 'ISSUED'" [class.text-success]="p.status === 'ISSUED'"
                            [class.bg-warning-subtle]="p.status === 'PENDING'" [class.text-warning]="p.status === 'PENDING'"
                            [class.bg-info-subtle]="p.status === 'DISPENSED'" [class.text-info]="p.status === 'DISPENSED'">
                            {{p.status}}
                         </span>
                         <small class="text-muted ms-2">{{p.createdAt || 'Unknown Date' | date:'mediumDate'}}</small>
                       </div>
                       <a [routerLink]="['/prescription']" [queryParams]="{id: p.id, cloneId: p.id}" class="btn btn-sm btn-link text-decoration-none">
                         Renew <i class="bi bi-arrow-repeat"></i>
                       </a>
                    </div>
                    
                    <h6 class="mb-1 fw-bold">Prescribed Items:</h6>
                    <ul class="list-unstyled mb-0 small text-muted">
                      <li *ngFor="let item of p.items | slice:0:3">
                        • {{item.medicineName}} ({{item.dosage}})
                      </li>
                      <li *ngIf="p.items.length > 3" class="fst-italic">+ {{p.items.length - 3}} more...</li>
                    </ul>
                    
                    <div class="mt-3 pt-2 border-top">
                         <a [routerLink]="['/prescriptions', p.id]" class="btn btn-sm btn-light w-100">View Details</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .apollo-card {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
      border: 1px solid rgba(0,0,0,0.05);
    }
  `]
})
export class PatientProfileComponent implements OnInit {
  patientId: number | null = null;
  patientName: string | null = null;
  patientEmail: string | null = null;
  prescriptions: Prescription[] = [];
  adherenceScore: number = 0;
  dashArray = 339.292;
  dashOffset = 339.292;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private prescriptionService: PrescriptionService,
    private adherenceService: AdherenceService
  ) { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.patientId = id;
      this.loadHistory(id);
      this.loadAdherence(id);
    }
  }

  loadAdherence(id: number): void {
    this.adherenceService.getPatientAdherenceScore(id).subscribe({
      next: (data) => {
        this.adherenceScore = Math.round(data.score);
        this.dashOffset = this.dashArray - (this.dashArray * this.adherenceScore / 100);
      },
      error: (err) => console.error('Error loading adherence', err)
    });
  }

  loadHistory(id: number): void {
    this.prescriptionService.getPrescriptionsByPatientId(id).subscribe({
      next: (data) => {
        this.prescriptions = data;
        this.loading = false;
        if (data.length > 0) {
          const p = data[0];
          this.patientEmail = p.patientEmail || (p.patient?.email);
          this.patientName = p.patient?.fullName || this.patientEmail;
        }
      },
      error: (err) => {
        console.error('Error loading history', err);
        this.loading = false;
      }
    });
  }

  issuePrescription(): void {
    this.router.navigate(['/prescription']);
  }
}
