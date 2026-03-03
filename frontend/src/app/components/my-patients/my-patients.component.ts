import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DoctorService, PatientRisk } from '../../services/doctor.service';

@Component({
    selector: 'app-my-patients',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
    <div class="container mt-4">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2 class="fw-bold"><i class="bi bi-people-fill text-primary me-2"></i>My Patients</h2>
        <div class="btn-group">
            <button class="btn btn-outline-secondary active">Risk Level</button>
            <button class="btn btn-outline-secondary">Name</button>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-md-12">
            <div class="card apollo-card border-0">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="bg-light">
                                <tr>
                                    <th class="ps-4 py-3 border-bottom">Patient</th>
                                    <th class="py-3 border-bottom text-center">Risk Level</th>
                                    <th class="py-3 border-bottom text-center">Adherence Score</th>
                                    <th class="py-3 border-bottom text-center">Missed Doses</th>
                                    <th class="py-3 border-bottom text-center">Fulfillment Status</th>
                                    <th class="pe-4 py-3 border-bottom text-end">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr *ngFor="let p of patients">
                                    <td class="ps-4 py-3">
                                        <div class="d-flex align-items-center">
                                            <div class="avatar-circle text-white me-3 small fw-bold d-flex align-items-center justify-content-center"
                                                [ngClass]="{'bg-danger': p.riskLevel === 'HIGH', 'bg-warning': p.riskLevel === 'MEDIUM', 'bg-success': p.riskLevel === 'LOW'}"
                                                style="width: 40px; height: 40px; border-radius: 50%;">
                                                {{ p.riskLevel === 'HIGH' ? '!' : (p.riskLevel === 'MEDIUM' ? '!' : '✓') }}
                                            </div>
                                            <div>
                                                <div class="fw-bold text-dark">{{ p.patientName }}</div>
                                                <div class="text-muted small">ID: {{ p.patientId }}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="py-3 text-center">
                                        <span class="badge rounded-pill" 
                                            [ngClass]="{'bg-danger': p.riskLevel === 'HIGH', 'bg-warning text-dark': p.riskLevel === 'MEDIUM', 'bg-success': p.riskLevel === 'LOW'}">
                                            {{ p.riskLevel }}
                                        </span>
                                    </td>
                                    <td class="py-3 text-center">
                                        <div class="d-flex align-items-center justify-content-center">
                                            <div class="progress w-50 me-2" style="height: 6px;">
                                                <div class="progress-bar" 
                                                    [ngClass]="{'bg-danger': p.adherenceScore < 50, 'bg-warning': p.adherenceScore >= 50 && p.adherenceScore < 80, 'bg-success': p.adherenceScore >= 80}"
                                                    [style.width]="p.adherenceScore + '%'"></div>
                                            </div>
                                            <small class="fw-bold">{{ p.adherenceScore }}%</small>
                                        </div>
                                    </td>
                                    <td class="py-3 text-center text-danger fw-bold">
                                        {{ p.missedDoses > 0 ? p.missedDoses : '-' }}
                                    </td>
                                    <td class="py-3 text-center">
                                        <div *ngIf="p.lastPharmacistName" class="small">
                                            <div class="fw-bold text-success">{{ p.lastPharmacistName }}</div>
                                            <div class="text-muted" style="font-size: 0.75rem;">{{ p.lastDispensedAt | date:'short' }}</div>
                                        </div>
                                        <div *ngIf="!p.lastPharmacistName" class="text-muted small">Pending</div>
                                    </td>
                                    <td class="pe-4 py-3 text-end">
                                        <a [routerLink]="['/patient-profile', p.patientId]" class="btn btn-sm btn-outline-primary rounded-pill">
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
  `,
    styles: [`
    .apollo-card {
        box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        border-radius: 20px;
    }
  `]
})
export class MyPatientsComponent implements OnInit {
    patients: PatientRisk[] = [];

    constructor(private doctorService: DoctorService) { }

    ngOnInit(): void {
        this.doctorService.getPatientsByRisk().subscribe({
            next: (data) => this.patients = data,
            error: (err) => console.error('Failed to load patients', err)
        });
    }
}
