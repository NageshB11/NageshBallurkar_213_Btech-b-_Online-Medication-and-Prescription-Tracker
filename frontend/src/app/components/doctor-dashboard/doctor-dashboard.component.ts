import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './doctor-dashboard.component.html',
    styleUrls: ['./doctor-dashboard.component.css']
})
export class DoctorDashboardComponent implements OnInit {
    prescriptions: Prescription[] = [];
    issuedPrescriptions: Prescription[] = [];
    draftPrescriptions: Prescription[] = [];
    appointments: Appointment[] = [];
    allAppointments: Appointment[] = [];
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
    doctorName: string = '';

    // Rescheduling Modal fields
    showRescheduleModal = false;
    rescheduleTargetAppointment: Appointment | null = null;
    rescheduleDateOnly: string = '';
    rescheduleTimeOnly: string = '';
    rescheduleNotes: string = '';
    availableTimeSlots: string[] = [];
    minAppointmentDateOnly: string = '';

    constructor(
        private prescriptionService: PrescriptionService,
        private appointmentService: AppointmentService,
        private authService: AuthService,
        private renewalService: RenewalService
    ) { }

    ngOnInit(): void {
        const profile = this.authService.getProfile();
        this.doctorId = profile?.id ? Number(profile.id) : null;
        this.doctorName = profile?.fullName || 'Doctor';

        this.loadPrescriptions();
        this.loadAnalytics();
        this.loadAppointments();
        this.loadRenewals();
    }

    loadPrescriptions(): void {
        this.prescriptionService.getIssuedPrescriptions().subscribe({
            next: (data) => {
                // Sorting by ID descending to ensure latest first as a frontend fallback
                const sortedData = [...data].sort((a, b) => (b.id || 0) - (a.id || 0));
                
                this.prescriptions = sortedData;
                this.issuedPrescriptions = sortedData.filter(p => !p.isDraft);
                this.draftPrescriptions = sortedData.filter(p => p.isDraft);
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
                this.allAppointments = data;
                this.appointments = data.filter(a => a.status === 'REQUESTED');
            },
            error: (err) => console.error('Failed to load appointments', err)
        });
    }

    private getLocalDateString(date: Date): string {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    private isTodayDate(dateStr: string): boolean {
        if (!dateStr) return false;
        const todayStr = this.getLocalDateString(new Date());
        return dateStr === todayStr;
    }

    generateTimeSlots(selectedDateStr: string): string[] {
        const slots: string[] = [];
        const isToday = this.isTodayDate(selectedDateStr);
        const now = new Date();
        for (let hour = 8; hour <= 21; hour++) {
            for (let min of ['00', '30']) {
                if (hour === 21 && min === '30') continue;
                const timeStr = `${hour.toString().padStart(2, '0')}:${min}`;
                if (isToday) {
                    const slotTime = new Date();
                    slotTime.setHours(hour, parseInt(min), 0, 0);
                    if (slotTime.getTime() > now.getTime() + 15 * 60 * 1000) {
                        slots.push(timeStr);
                    }
                } else {
                    slots.push(timeStr);
                }
            }
        }
        return slots;
    }

    hasConflict(appt: Appointment): boolean {
        if (!appt.appointmentDate) return false;
        const apptTime = new Date(appt.appointmentDate).getTime();
        return this.allAppointments.some(other => 
            other.id !== appt.id &&
            other.status !== 'REJECTED' &&
            other.status !== 'CANCELLED' &&
            new Date(other.appointmentDate).getTime() === apptTime
        );
    }

    openRescheduleModal(appt: Appointment): void {
        this.rescheduleTargetAppointment = appt;
        this.showRescheduleModal = true;
        const now = new Date();
        this.minAppointmentDateOnly = this.getLocalDateString(now);
        
        let apptDate = new Date(appt.appointmentDate);
        if (isNaN(apptDate.getTime())) {
            apptDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }
        this.rescheduleDateOnly = this.getLocalDateString(apptDate);
        this.availableTimeSlots = this.generateTimeSlots(this.rescheduleDateOnly);
        
        const hour = apptDate.getHours().toString().padStart(2, '0');
        const min = apptDate.getMinutes() < 30 ? '00' : '30';
        this.rescheduleTimeOnly = `${hour}:${min}`;
        if (!this.availableTimeSlots.includes(this.rescheduleTimeOnly) && this.availableTimeSlots.length > 0) {
            this.rescheduleTimeOnly = this.availableTimeSlots[0];
        }
        this.rescheduleNotes = appt.notes || '';
    }

    closeRescheduleModal(): void {
        this.showRescheduleModal = false;
        this.rescheduleTargetAppointment = null;
    }

    onRescheduleDateOnlyChange(): void {
        if (!this.rescheduleDateOnly) return;
        const now = new Date();
        const todayStr = this.getLocalDateString(now);
        if (this.rescheduleDateOnly < todayStr) {
            this.rescheduleDateOnly = todayStr;
        }
        this.availableTimeSlots = this.generateTimeSlots(this.rescheduleDateOnly);
        if (this.availableTimeSlots.length > 0 && !this.availableTimeSlots.includes(this.rescheduleTimeOnly)) {
            this.rescheduleTimeOnly = this.availableTimeSlots[0];
        }
    }

    submitReschedule(): void {
        if (!this.rescheduleTargetAppointment || !this.rescheduleTargetAppointment.id) return;
        if (!this.rescheduleDateOnly || !this.rescheduleTimeOnly) {
            alert('Please select a valid date and time slot!');
            return;
        }
        const newDateTimeStr = `${this.rescheduleDateOnly}T${this.rescheduleTimeOnly}:00`;
        this.appointmentService.rescheduleAppointment(
            this.rescheduleTargetAppointment.id,
            newDateTimeStr,
            this.rescheduleNotes
        ).subscribe({
            next: () => {
                alert('Appointment rescheduled and approved. Patient has been notified.');
                this.closeRescheduleModal();
                this.loadAppointments();
            },
            error: (err) => {
                console.error('Failed to reschedule appointment', err);
                alert('Failed to reschedule appointment.');
            }
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