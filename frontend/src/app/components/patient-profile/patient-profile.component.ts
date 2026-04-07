import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { PrescriptionService } from '../../services/prescription.service';
import { AdherenceService } from '../../services/adherence.service';
import { DoctorService } from '../../services/doctor.service';
import { MedScheduleService, MedicationSchedule } from '../../services/med-schedule.service';
import { NotificationService } from '../../services/notification.service';
import { AppointmentService } from '../../services/appointment.service';
import { Prescription } from '../../models/prescription.model';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container py-3">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <a routerLink="/doctor/patients" class="text-decoration-none text-secondary mb-2 d-inline-block">
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
          <div class="apollo-card p-3">
            <div class="text-center mb-2">
              <div class="avatar-xl rounded-circle bg-primary-subtle text-primary fw-bold mx-auto mb-2 d-flex align-items-center justify-content-center" style="width: 70px; height: 70px; font-size: 1.8rem;">
                {{patientName?.charAt(0) || '?'}}
              </div>
              <h5 class="fw-bold mb-0">{{patientName || 'Unknown'}}</h5>
              <p class="text-muted small mb-0">{{patientEmail}}</p>
            </div>
            
            <hr class="my-2 op-10">
            
            <h6 class="text-uppercase text-secondary small fw-bold mb-2">Quick Actions</h6>
            <div class="d-grid gap-2">
              <button (click)="sendMessage()" class="btn btn-light text-start border"><i class="bi bi-envelope me-2"></i> Send Message</button>
              <button (click)="scheduleAppointment()" class="btn btn-light text-start border"><i class="bi bi-calendar-event me-2"></i> Schedule Appointment</button>
            </div>
            
            <hr class="my-3 op-10">
            
            <h6 class="text-uppercase text-secondary small fw-bold mb-2">Medical History</h6>
            <div class="p-3 bg-light rounded-3 text-start mb-2" style="font-size: 0.85rem; border: 1px solid #e2e8f0;">
              <i class="bi bi-file-medical text-primary me-2 fs-6 align-middle"></i>
              <span class="text-secondary align-middle">{{medicalHistory || 'Loading...'}}</span>
            </div>
          </div>
          
          <!-- Adherence Card -->
          <div class="apollo-card p-3 mt-2 text-center">
            <h6 class="text-uppercase text-secondary small fw-bold mb-2">Adherence Score</h6>
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
                    
                    <div *ngIf="p.status === 'DISPENSED' && p.pharmacist" class="mt-2 text-muted small border-top pt-2">
                         <i class="bi bi-person-badge text-info me-1"></i> Dispensed by: <strong>{{ p.pharmacist.fullName || p.pharmacist.email }}</strong>
                         <span *ngIf="p.dispensedAt" class="ms-1">on {{ p.dispensedAt | date:'mediumDate' }}</span>
                    </div>

                    <div class="mt-3 pt-2 border-top">
                        <button class="btn btn-sm btn-outline-dark w-100 d-flex justify-content-between align-items-center" (click)="toggleAdherenceMatrix(p.id!)">
                            <span><i class="bi bi-calendar3-range me-2"></i> Adherence Audit History</span>
                            <i class="bi" [ngClass]="prescriptionAdherence[p.id!] ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
                        </button>
                        
                        <div *ngIf="loadingAdherence[p.id!]" class="text-center py-3">
                            <div class="spinner-border spinner-border-sm text-primary"></div>
                        </div>

                        <!-- Adherence Matrix Grid -->
                        <div *ngIf="prescriptionAdherence[p.id!]" class="mt-3 adherence-matrix-container animate__animated animate__fadeIn">
                            <div class="table-responsive">
                                <table class="table table-sm table-bordered text-center align-middle mb-0" style="font-size: 0.75rem;">
                                    <thead class="bg-light">
                                        <tr>
                                            <th class="text-start ps-2">Date</th>
                                            <th>B</th>
                                            <th>L</th>
                                            <th>D</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr *ngFor="let day of prescriptionAdherence[p.id!]">
                                            <td class="text-start ps-2 fw-bold text-muted">{{day.date | date:'MMM d'}}</td>
                                            <td><i class="bi" [ngClass]="getLogIcon(day.BREAKFAST)" [title]="day.BREAKFAST?.status || 'No Log'"></i></td>
                                            <td><i class="bi" [ngClass]="getLogIcon(day.LUNCH)" [title]="day.LUNCH?.status || 'No Log'"></i></td>
                                            <td><i class="bi" [ngClass]="getLogIcon(day.DINNER)" [title]="day.DINNER?.status || 'No Log'"></i></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="d-flex justify-content-center gap-3 mt-2 small text-muted" style="font-size: 0.65rem;">
                                <span><i class="bi bi-check-circle-fill text-success me-1"></i> Taken</span>
                                <span><i class="bi bi-x-circle-fill text-danger me-1"></i> Missed</span>
                                <span><i class="bi bi-clock-history text-warning me-1"></i> Snoozed</span>
                            </div>
                        </div>
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
  medicalHistory: string | null = null;
  prescriptions: Prescription[] = [];
  adherenceScore: number = 0;
  dashArray = 339.292;
  dashOffset = 339.292;
  loading = true;

  // Adherence Matrix State
  prescriptionAdherence: Record<number, any[]> = {};
  loadingAdherence: Record<number, boolean> = {};

  threshold: number = 80;
  savingThreshold: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private prescriptionService: PrescriptionService,
    private adherenceService: AdherenceService,
    private doctorService: DoctorService,
    private scheduleService: MedScheduleService,
    private notificationService: NotificationService,
    private appointmentService: AppointmentService
  ) { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.patientId = id;
      this.loadHistory(id);
      this.loadAdherence(id);
    }
  }

  toggleAdherenceMatrix(prescriptionId: number): void {
    if (this.prescriptionAdherence[prescriptionId]) {
      delete this.prescriptionAdherence[prescriptionId];
      return;
    }

    this.loadingAdherence[prescriptionId] = true;
    this.adherenceService.getPrescriptionAdherence(prescriptionId).subscribe({
      next: (logs) => {
        this.prescriptionAdherence[prescriptionId] = this.groupLogsByDate(logs);
        this.loadingAdherence[prescriptionId] = false;
      },
      error: (err) => {
        console.error('Error loading adherence matrix', err);
        this.loadingAdherence[prescriptionId] = false;
        alert('Could not load adherence logs.');
      }
    });
  }

  groupLogsByDate(logs: any[]): any[] {
    const groups: Record<string, any> = {};
    logs.forEach(log => {
      const d = log.date;
      if (!groups[d]) groups[d] = { date: d, BREAKFAST: null, LUNCH: null, DINNER: null };
      groups[d][log.meal || log.mealSlot] = log;
    });
    return Object.values(groups).sort((a, b) => b.date.toString().localeCompare(a.date.toString()));
  }

  getLogIcon(log: any): string {
    if (!log) return 'bi-dash-circle text-light';
    if (log.status === 'TAKEN' || log.taken) return 'bi-check-circle-fill text-success';
    if (log.status === 'MISSED') return 'bi-x-circle-fill text-danger';
    if (log.status === 'SNOOZED') return 'bi-clock-history text-warning';
    return 'bi-circle text-muted op-30';
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
        // Sorting by ID descending for latest-first view fallback
        const sortedData = [...data].sort((a, b) => (b.id || 0) - (a.id || 0));
        this.prescriptions = sortedData;
        this.loading = false;
        if (sortedData.length > 0) {
          const p = sortedData[0];
          this.patientEmail = p.patientEmail || (p.patient?.email);
          this.patientName = p.patient?.fullName || this.patientEmail;
          // Extract medical history if available
          if (p.patient && (p.patient as any).medicalHistory) {
            this.medicalHistory = (p.patient as any).medicalHistory;
          } else {
            this.medicalHistory = 'No medical history recorded.';
          }
          // Assuming user entity might have adherenceThreshold appended to patient?
          // If so:
          if (p.patient && (p.patient as any).adherenceThreshold !== undefined) {
            this.threshold = (p.patient as any).adherenceThreshold;
          }
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

  sendMessage(): void {
    const msg = prompt('Enter message for ' + (this.patientName || 'this patient') + ':');
    if (msg && this.patientId) {
      this.notificationService.sendNotification(this.patientId, msg).subscribe({
        next: () => alert('Message sent successfully!'),
        error: (err) => {
          console.error(err);
          alert('Failed to send message.');
        }
      });
    }
  }

  scheduleAppointment(): void {
    const dateInput = prompt('Enter appointment date and time (YYYY-MM-DDTHH:MM):', new Date().toISOString().slice(0, 16));
    if (dateInput && this.patientId) {
      const notes = prompt('Enter notes for the appointment:');
      const appointment = {
        patientId: this.patientId,
        appointmentDate: dateInput,
        notes: notes || 'Scheduled by doctor via profile quick action'
      };
      
      this.appointmentService.requestAppointment(appointment).subscribe({
        next: () => alert('Appointment scheduled successfully!'),
        error: (err) => {
          console.error(err);
          alert('Failed to schedule appointment. Please ensure date format is correct (YYYY-MM-DDTHH:MM)');
        }
      });
    }
  }
}
