import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PrescriptionService } from '../../services/prescription.service';

@Component({
    selector: 'app-patient-list',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    template: `
    <div class="container py-5">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2 class="fw-bold text-dark">My Patients</h2>
        <div class="input-group w-auto">
          <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span>
          <input type="text" class="form-control border-start-0 ps-0" placeholder="Search patients..." [(ngModel)]="searchTerm">
        </div>
      </div>

      <div class="apollo-card p-0 overflow-hidden">
        <div class="table-responsive">
          <table class="table table-hover mb-0 align-middle">
            <thead class="bg-light">
              <tr>
                <th class="ps-4 py-3">Patient Name</th>
                <th class="py-3">Email</th>
                <th class="py-3 text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let patient of filteredPatients()">
                <td class="ps-4 py-3">
                  <div class="d-flex align-items-center">
                    <div class="avatar-initial rounded-circle bg-primary-subtle text-primary fw-bold me-3" 
                         style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
                      {{patient.fullName?.charAt(0) || patient.email.charAt(0) | uppercase}}
                    </div>
                    <span class="fw-semibold text-dark">{{patient.fullName || 'Unknown'}}</span>
                  </div>
                </td>
                <td class="text-secondary">{{patient.email}}</td>
                <td class="text-end pe-4">
                  <a [routerLink]="['/patients', patient.id]" class="btn btn-sm btn-outline-primary rounded-pill px-3">
                    View History
                  </a>
                </td>
              </tr>
              <tr *ngIf="filteredPatients().length === 0">
                <td colspan="3" class="text-center py-5 text-muted">
                  <i class="bi bi-person-x fs-1 d-block mb-2"></i>
                  No patients found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="mt-4">
        <a routerLink="/doctor-dashboard" class="text-decoration-none text-secondary">
          <i class="bi bi-arrow-left me-1"></i> Back to Dashboard
        </a>
      </div>
    </div>
  `,
    styles: [`
    .apollo-card {
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }
  `]
})
export class PatientListComponent implements OnInit {
    patients: any[] = [];
    searchTerm: string = '';

    constructor(private prescriptionService: PrescriptionService) { }

    ngOnInit(): void {
        this.loadPatients();
    }

    loadPatients(): void {
        this.prescriptionService.getPatients().subscribe({
            next: (data) => this.patients = data,
            error: (err) => console.error('Error loading patients', err)
        });
    }

    filteredPatients(): any[] {
        if (!this.searchTerm) return this.patients;
        const term = this.searchTerm.toLowerCase();
        return this.patients.filter(p =>
            (p.fullName && p.fullName.toLowerCase().includes(term)) ||
            p.email.toLowerCase().includes(term)
        );
    }
}
