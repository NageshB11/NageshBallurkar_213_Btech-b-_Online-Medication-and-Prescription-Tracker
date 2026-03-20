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
import { User } from '../../models/user.model';

import { VitalsChartComponent } from '../vitals-chart/vitals-chart.component';
import { SosCardComponent } from '../sos-card/sos-card.component';
import { AdherenceGaugeComponent } from '../adherence-gauge/adherence-gauge.component';
import { RenewalService } from '../../services/renewal.service';
import { DoseLogService, DoseLog } from '../../services/dose-log.service';
import { MedScheduleService, MedicationSchedule, PatientMealPrefs, MedScheduleRequest } from '../../services/med-schedule.service';
import { PatientGuideCardComponent } from '../patient-guide-card/patient-guide-card.component';

@Component({
    selector: 'app-patient-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, VitalsChartComponent, SosCardComponent, AdherenceGaugeComponent, PatientGuideCardComponent],
    templateUrl: './patient-dashboard.component.html',
    styleUrls: ['./patient-dashboard.component.css']
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

    // Live Dose Alerts
    dueDoses: DoseLog[] = [];

    // Temporal Adherence Blocks
    adherenceBlocks: any[] = [];
    selectedBlock: any = null;

    isUserMenuOpen = false;
    currentUser: User | null = null;
    showProfileModal = false;

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
        this.currentUser = profile;
        this.userName = profile?.fullName || 'Patient';
        this.userId = profile?.id ? Number(profile.id) : null;
        this.loadData();
        this.doctorService.getAllDoctors().subscribe({
            next: (data) => this.doctors = data,
            error: (err) => console.error('Error loading doctors', err)
        });

        this.pollSub = interval(10000).subscribe(() => this.fetchNotifications());
        this.doseCheckSub = interval(60000).subscribe(() => this.checkDueDoses());

        // Initial check
        this.checkDueDoses();

        // Connect to Live RxJS Adherence Stream for instant Gauges
        this.adherenceService.liveAdherence$.subscribe(val => {
            if (val > 0) this.myAdherence30Days = val;
        });
    }

    ngOnDestroy(): void {
        if (this.pollSub) this.pollSub.unsubscribe();
        if (this.doseCheckSub) this.doseCheckSub.unsubscribe();
        if (this.trendChart) this.trendChart.destroy();
    }

    ngAfterViewInit(): void {
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = '#636e72';
    }

    checkDueDoses(): void {
        this.doseLogService.getTodaysDoses().subscribe({
            next: (doses) => {
                const now = new Date();
                this.dueDoses = doses.filter(d => {
                    if (d.status !== 'PENDING') return false;
                    const schedTime = this.parseDate(d.scheduledTime);
                    if (!schedTime) return false;
                    // Trigger alert if it's currently at or past the scheduled time 
                    // AND less than 4 hours past (we don't alert for yesterday's missed doses continuously)
                    const diffMs = now.getTime() - schedTime.getTime();
                    return diffMs >= 0 && diffMs < (4 * 60 * 60 * 1000);
                });
            },
            error: (err) => console.error('Error fetching due doses:', err)
        });
    }

    takeDoseAlert(dose: DoseLog): void {
        this.doseLogService.markDose(dose.doseId, 'TAKEN').subscribe({
            next: () => {
                this.adherenceService.triggerInstantIncrement(25); // RxJS Instant 25% Increment
                this.checkDueDoses();
                this.loadData(); // refresh adherence stats from server
            }
        });
    }

    snoozeDoseAlert(dose: DoseLog): void {
        this.doseLogService.snoozeDose(dose.doseId).subscribe({
            next: () => {
                this.checkDueDoses();
            }
        });
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
                console.log('Raw API Prescriptions:', data);
                this.activePrescriptions = data.filter(p => {
                    const status = p.status as string;
                    return status === 'ISSUED' || status === 'PENDING' || status === 'PROCEEDED_TO_PHARMACIST' || status === 'DISPENSED' || status === 'APPROVED';
                });
                this.dispensedPrescriptions = data.filter(p => p.status === 'DISPENSED');
                this.enrichPrescriptions();
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
                    this.enrichPrescriptions();
                },
                error: (err) => console.error('Error fetching adherence logs', err),
                complete: () => this.calculateOverallAdherence()
            });

            this.appointmentService.getPatientAppointments(this.userId).subscribe({
                next: (data) => this.appointments = data,
                error: (err) => console.error('Error fetching appointments', err)
            });

            this.doseLogService.getMyAdherenceStats().subscribe({
                next: (stats) => {
                    this.myAdherence30Days = stats.percent;
                    this.adherenceService.setLiveAdherence(stats.percent); // Sync stream with server
                },
                error: (err) => console.error('Error fetching 30-day adherence', err)
            });
        }
    }

    enrichPrescriptions(): void {
        if (this.activePrescriptions.length > 0) {
            this.activePrescriptions.forEach(p => {
                p.doseSchedule = this.getAdherenceBlocks(p);
            });
        }
    }

    renderTrendChart(data: any[]): void {
        if (!this.trendChartCanvas) return;

        const labels = data.map(d => {
            const dateObj = new Date(d.date);
            return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        });
        const values = data.map(d => d.percent);

        if (this.trendChart) {
            this.trendChart.destroy();
        }

        this.trendChart = new Chart(this.trendChartCanvas.nativeElement, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Adherence %',
                    data: values,
                    borderColor: '#0984e3',
                    backgroundColor: 'rgba(9, 132, 227, 0.1)',
                    borderWidth: 3,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#0984e3',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (context: any) {
                                return context.parsed.y + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { stepSize: 20 }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
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
                    this.adherenceService.triggerInstantIncrement(25); // RxJS Instant 25% Increment
                    alert('Medication logged successfully!');
                    this.loadData();
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

    private parseDate(val: any): Date | null {
        if (!val) return null;
        if (Array.isArray(val)) {
            // [year, month, day, hour, minute]
            if (val.length >= 3) return new Date(val[0], val[1] - 1, val[2], val[3] || 0, val[4] || 0);
            return null;
        }
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    }

    formatDate(val: any): string {
        const d = this.parseDate(val);
        if (!d) return 'N/A';
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Generates a sequence of days for a medication's duration.
     * Each day is represented as an AdherenceDay object.
     */
    getMedicationSequence(prescription: Prescription): any[] {
        if (!prescription.items || prescription.items.length === 0 || !prescription.id) return [];
        const item = prescription.items[0];

        const startDateRaw = item.startDate || prescription.createdAt;
        const start = this.parseDate(startDateRaw);
        if (!start) return [];

        start.setHours(0, 0, 0, 0);

        // Calculate duration (default 7 days if not specified)
        const duration = item.endDate ? 
            Math.ceil((this.parseDate(item.endDate)!.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 7;
        
        const days = [];
        for (let i = 0; i < duration; i++) {
            const currentDay = new Date(start);
            currentDay.setDate(start.getDate() + i);
            
            const dateStr = currentDay.toISOString().split('T')[0];
            const taken = this.adherenceLogs.some(log => {
                const logDateRaw = log.takenAt || log.createdAt || log.logDate;
                const logDate = this.parseDate(logDateRaw);
                return log.prescription?.id === prescription.id && logDate && logDate.toISOString().split('T')[0] === dateStr;
            });

            days.push({
                date: currentDay,
                dateStr: dateStr,
                label: currentDay.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                taken: taken
            });
        }
        return days;
    }

    /**
     * Checks if a specific day is loggable (is today and not already taken)
     */
    isAlreadyLoggedToday(prescriptionId: number | undefined): boolean {
        if (!prescriptionId || !this.adherenceLogs) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.adherenceLogs.some(log => {
            const logDate = new Date(log.logTimestamp);
            logDate.setHours(0, 0, 0, 0);
            return log.prescriptionId === prescriptionId && logDate.getTime() === today.getTime();
        });
    }

    isLoggable(day: any, prescriptionId: number | undefined): boolean {
        if (!prescriptionId) return false;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const blockDate = new Date(day.date);
        blockDate.setHours(0, 0, 0, 0);

        // Loggable only if it is today AND not already taken
        return blockDate.getTime() === today.getTime() && !day.taken;
    }

    /**
     * Returns tooltip text for medication blocks
     */
    getBlockTooltip(day: any, prescriptionId: number | undefined): string {
        if (day.taken) return 'Dose logged for this day ✅';
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const blockDate = new Date(day.date);
        blockDate.setHours(0, 0, 0, 0);

        if (blockDate.getTime() > today.getTime()) {
            return `This dose is scheduled for ${day.label}`;
        }
        if (blockDate.getTime() < today.getTime()) {
            return 'Missed dose tracking window passed';
        }
        return 'Click to log today\'s adherence';
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

    toggleUserMenu(): void {
        this.isUserMenuOpen = !this.isUserMenuOpen;
    }

    openProfileModal(): void {
        this.isUserMenuOpen = false;
        this.showProfileModal = true;
    }

    logout(): void {
        this.authService.logout();
    }
}

