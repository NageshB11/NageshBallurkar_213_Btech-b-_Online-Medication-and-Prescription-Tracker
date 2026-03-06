import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PrescriptionService } from '../../services/prescription.service';
import { NotificationService, Notification } from '../../services/notification.service';
import { Subscription, interval } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { AppointmentService } from '../../services/appointment.service';
import { AdherenceService } from '../../services/adherence.service';
import { DoctorService, DoctorUser } from '../../services/doctor.service';
import { Prescription } from '../../models/prescription.model';
import { Appointment, AppointmentStatus } from '../../models/appointment.model';

import { VitalsChartComponent } from '../vitals-chart/vitals-chart.component';
import { SosCardComponent } from '../sos-card/sos-card.component';
import { AdherenceGaugeComponent } from '../adherence-gauge/adherence-gauge.component';
import { RenewalService } from '../../services/renewal.service';
import { DoseLogService } from '../../services/dose-log.service';

@Component({
    selector: 'app-patient-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, VitalsChartComponent, SosCardComponent, AdherenceGaugeComponent],
    templateUrl: './patient-dashboard.component.html',
    styleUrl: './patient-dashboard.component.css'
})
export class PatientDashboardComponent implements OnInit, OnDestroy {
    activePrescriptions: Prescription[] = [];
    dispensedPrescriptions: Prescription[] = [];
    notifications: Notification[] = [];
    appointments: Appointment[] = [];
    userName: string = '';
    userId: number | null = null;
    loading = true;
    selectedHistory: any[] | null = null;
    adherenceLogs: any[] = []; // Store logs
    myAdherence30Days: number = 0;
    private pollSub?: Subscription;

    // For Appointment Modal
    showAppointmentModal = false;
    newAppointmentDate: string = '';
    newAppointmentNotes: string = '';
    selectedDoctorId: number | null = null;
    doctors: DoctorUser[] = [];

    // Active sidebar section
    activeSection: string = 'overview';

    constructor(
        private prescriptionService: PrescriptionService,
        private notificationService: NotificationService,
        private authService: AuthService,
        private appointmentService: AppointmentService,
        private adherenceService: AdherenceService,
        private renewalService: RenewalService,
        private doctorService: DoctorService,
        private doseLogService: DoseLogService
    ) { }

    ngOnInit(): void {
        const profile = this.authService.getProfile();
        this.userName = profile?.fullName || 'Patient';
        this.userId = profile?.id ? Number(profile.id) : null;
        this.loadData();
        this.doctorService.getAllDoctors().subscribe({
            next: (data) => this.doctors = data,
            error: (err) => console.error('Error loading doctors', err)
        });

        this.pollSub = interval(10000).subscribe(() => this.fetchNotifications());
    }

    ngOnDestroy(): void {
        if (this.pollSub) this.pollSub.unsubscribe();
    }

    fetchNotifications(): void {
        this.notificationService.getMyNotifications().subscribe({
            next: (data) => {
                this.notifications = data.filter(n => !n.read).slice(0, 5);
            },
            error: (err) => console.error('Error fetching notifications', err)
        });
    }

    overallAdherence: number = 0;

    calculateOverallAdherence(): void {
        if (this.activePrescriptions.length === 0) {
            this.overallAdherence = 0;
            return;
        }
        const total = this.activePrescriptions.reduce((sum, p) => sum + this.getDosageProgress(p), 0);
        this.overallAdherence = Math.round(total / this.activePrescriptions.length);
    }

    loadData(): void {
        this.loading = true;
        this.prescriptionService.getMyPrescriptions().subscribe({
            next: (data) => {
                this.activePrescriptions = data.filter(p => p.status === 'ISSUED' || p.status === 'PENDING' || p.status === 'PROCEEDED_TO_PHARMACIST');
                this.dispensedPrescriptions = data.filter(p => p.status === 'DISPENSED');
                this.loading = false;
            },
            error: (err: any) => {
                console.error('Error fetching prescriptions', err);
                this.loading = false;
            }
        });

        this.fetchNotifications();

        if (this.userId) {
            this.adherenceService.getPatientLogs(this.userId).subscribe({
                next: (data) => {
                    this.adherenceLogs = data;
                },
                error: (err) => console.error('Error fetching adherence logs', err),
                complete: () => this.calculateOverallAdherence()
            });

            this.appointmentService.getPatientAppointments(this.userId).subscribe({
                next: (data) => this.appointments = data,
                error: (err) => console.error('Error fetching appointments', err)
            });

            this.doseLogService.getMyAdherenceStats().subscribe({
                next: (stats) => this.myAdherence30Days = stats.percent,
                error: (err) => console.error('Error fetching 30-day adherence', err)
            });
        }
    }

    openAppointmentModal(): void {
        this.showAppointmentModal = true;
        // Set default date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        this.newAppointmentDate = tomorrow.toISOString().slice(0, 16); // Format for datetime-local
    }

    closeAppointmentModal(): void {
        this.showAppointmentModal = false;
    }

    submitAppointment(): void {
        if (!this.userId) return;

        const request = {
            patientId: this.userId,
            doctorId: this.selectedDoctorId,
            appointmentDate: this.newAppointmentDate,
            notes: this.newAppointmentNotes
        };

        this.appointmentService.requestAppointment(request).subscribe({
            next: (res) => {
                alert('Appointment requested successfully!');
                this.closeAppointmentModal();
                this.loadData(); // Reload to show new appointment
            },
            error: (err) => {
                console.error('Error requesting appointment', err);
                alert('Failed to request appointment.');
            }
        });
    }

    logAdherence(prescription: Prescription): void {
        if (!this.userId || !prescription.id) return;

        if (confirm('Did you take your medication for today?')) {
            this.adherenceService.logAdherence(this.userId, prescription.id).subscribe({
                next: (res) => {
                    alert('Medication logged successfully!');
                    // Ideally update only the specific item or adherence stat
                },
                error: (err) => console.error('Error logging adherence', err)
            });
        }
    }

    requestRenewal(prescriptionId: number | undefined): void {
        if (!prescriptionId) return;
        if (confirm('Request refill for this prescription?')) {
            this.renewalService.requestRenewal(prescriptionId).subscribe({
                next: (res) => alert('Renewal requested sent to doctor.'),
                error: (err) => alert('Failed to request renewal: ' + err.error)
            });
        }
    }

    getNextDoseTime(prescription: Prescription): string {
        if (!prescription.items || prescription.items.length === 0) return 'Pending';
        const timing = prescription.items[0].dosageTiming?.toLowerCase() || '';

        // Return actual timing string from backend if available, or parse it
        return timing ? `Scheduled: ${timing}` : 'Scheduled';
    }

    getDosageProgress(prescription: Prescription): number {
        if (!prescription.items || prescription.items.length === 0) return 0;
        if (!prescription.id) return 0;

        const item = prescription.items[0];
        if (!item.startDate) return 0;

        const today = new Date();
        const start = new Date(item.startDate);
        start.setHours(0, 0, 0, 0);

        // Use endDate if available, otherwise assume 30-day course
        const end = item.endDate ? new Date(item.endDate) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
        end.setHours(23, 59, 59, 999);

        const effectiveToday = today < end ? today : end;

        let daysElapsed = Math.floor((effectiveToday.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        if (today > end) {
            daysElapsed = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        }

        if (daysElapsed < 0) daysElapsed = 0;

        const timings = item.dosageTiming ? item.dosageTiming.split(',') : ['Daily'];
        const totalExpected = daysElapsed * timings.length;

        const logsCount = this.adherenceLogs.filter(l => l.prescription?.id === prescription.id).length;

        if (totalExpected === 0) return 100;
        return Math.min(100, Math.round((logsCount / totalExpected) * 100));
    }

    getDashOffset(progress: number): number {
        const circumference = 2 * Math.PI * 55;
        return circumference - ((progress / 100) * circumference);
    }

    /** Returns "morning" / "afternoon" / "evening" based on local time */
    getGreeting(): string {
        const h = new Date().getHours();
        if (h < 12) return 'morning';
        if (h < 17) return 'afternoon';
        return 'evening';
    }

    /** Offset for overview ring  (r=62, circ≈390) */
    getAdherenceOffset(progress: number): number {
        const circ = 2 * Math.PI * 62;
        return circ - (progress / 100) * circ;
    }

    /** Offset for adherence-section ring  (r=68, circ≈427) */
    getAdherenceOffset2(progress: number): number {
        const circ = 2 * Math.PI * 68;
        return circ - (progress / 100) * circ;
    }

    downloadPdf(id: number | undefined): void {
        if (!id) return;
        this.prescriptionService.downloadPrescription(id).subscribe({
            next: (data: Blob) => {
                const url = window.URL.createObjectURL(data);
                const link = document.createElement('a');
                link.href = url;
                link.download = `prescription-${id}.pdf`;
                link.click();
                window.URL.revokeObjectURL(url);
            },
            error: (err) => console.error('Failed to download PDF', err)
        });
    }

    viewHistory(id: number | undefined): void {
        if (!id) return;
        this.prescriptionService.getAuditHistory(id).subscribe({
            next: (data) => this.selectedHistory = data,
            error: (err) => console.error('Failed to load history', err)
        });
    }

    closeHistory(): void {
        this.selectedHistory = null;
    }

    logout(): void {
        this.authService.logout();
    }
}

