import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PrescriptionService } from '../../services/prescription.service';
import { AppointmentService } from '../../services/appointment.service';
import { AuthService } from '../../services/auth.service';
import { Prescription } from '../../models/prescription.model';
import { Appointment } from '../../models/appointment.model';
import { Analytics } from '../../models/analytics.model';

import { RenewalService, RenewalRequest } from '../../services/renewal.service';

@Component({
    selector: 'app-doctor-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './doctor-dashboard.component.html',
    styleUrls: ['./doctor-dashboard.component.css']
})
export class DoctorDashboardComponent implements OnInit {
    prescriptions: Prescription[] = [];
    issuedPrescriptions: Prescription[] = [];
    draftPrescriptions: Prescription[] = [];
    appointments: Appointment[] = [];
    renewalRequests: RenewalRequest[] = [];
    analytics: Analytics = {
        totalPrescriptions: 0,
        pendingCount: 0,
        approvedCount: 0,
        dispensedCount: 0,
        activePatientsCount: 0,
        adherenceRate: 0
    };
    doctorId: number | null = null;

    constructor(
        private prescriptionService: PrescriptionService,
        private appointmentService: AppointmentService,
        private authService: AuthService,
        private renewalService: RenewalService
    ) { }

    ngOnInit(): void {
        const profile = this.authService.getProfile();
        this.doctorId = profile?.id ? Number(profile.id) : null;

        this.loadPrescriptions();
        this.loadAnalytics();
        this.loadAppointments();
        this.loadRenewals();
    }

    loadPrescriptions(): void {
        this.prescriptionService.getIssuedPrescriptions().subscribe({
            next: (data) => {
                this.prescriptions = data;
                this.issuedPrescriptions = data.filter(p => !p.isDraft);
                this.draftPrescriptions = data.filter(p => p.isDraft);
            },
            error: (err: any) => console.error('Failed to load prescriptions', err)
        });
    }

    loadAnalytics(): void {
        this.prescriptionService.getDoctorAnalytics().subscribe({
            next: (data: Analytics) => this.analytics = data,
            error: (err: any) => console.error('Failed to load analytics', err)
        });
    }

    loadAppointments(): void {
        if (!this.doctorId) return;
        this.appointmentService.getDoctorAppointments().subscribe({
            next: (data) => {
                this.appointments = data.filter(a => a.status === 'REQUESTED');
            },
            error: (err) => console.error('Failed to load appointments', err)
        });
    }

    loadRenewals(): void {
        this.renewalService.getDoctorRenewalRequests().subscribe({
            next: (data) => this.renewalRequests = data,
            error: (err) => console.error('Failed to load renewals', err)
        });
    }

    approveAppointment(id: number | undefined): void {
        if (!id) return;
        this.appointmentService.approveAppointment(id).subscribe({
            next: (res) => {
                this.loadAppointments();
                alert('Appointment approved.');
            },
            error: (err) => console.error('Failed to approve appointment', err)
        });
    }

    rejectAppointment(id: number | undefined): void {
        if (!id) return;
        this.appointmentService.rejectAppointment(id).subscribe({
            next: (res) => {
                this.loadAppointments();
                alert('Appointment rejected.');
            },
            error: (err) => console.error('Failed to reject appointment', err)
        });
    }

    approveRenewal(id: number): void {
        this.renewalService.updateRenewalStatus(id, 'APPROVED').subscribe({
            next: (res) => {
                this.loadRenewals();
                alert('Renewal approved.');
            },
            error: (err) => console.error('Failed to approve renewal', err)
        });
    }

    denyRenewal(id: number): void {
        this.renewalService.updateRenewalStatus(id, 'DENIED').subscribe({
            next: (res) => {
                this.loadRenewals();
                alert('Renewal denied.');
            },
            error: (err) => console.error('Failed to deny renewal', err)
        });
    }

    logout(): void {
        this.authService.logout();
    }
}

