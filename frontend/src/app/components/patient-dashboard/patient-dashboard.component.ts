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
import { AnalyticsService } from '../../services/analytics.service';
import { DoctorService, DoctorUser } from '../../services/doctor.service';
import { Prescription } from '../../models/prescription.model';
import { Appointment, AppointmentStatus } from '../../models/appointment.model';
import { User } from '../../models/user.model';

import { AdherenceGaugeComponent } from '../adherence-gauge/adherence-gauge.component';
import { RenewalService } from '../../services/renewal.service';
import { DoseLogService, DoseLog } from '../../services/dose-log.service';
import { MedScheduleService, MedicationSchedule, PatientMealPrefs, MedScheduleRequest } from '../../services/med-schedule.service';
import { PatientGuideCardComponent } from '../patient-guide-card/patient-guide-card.component';
import { AdherenceTrendChartComponent } from '../adherence-trend-chart/adherence-trend-chart.component';
import { PatientAdherenceComponent } from '../patient-adherence/patient-adherence.component';

import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

@Component({
    selector: 'app-patient-dashboard',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, AdherenceGaugeComponent, PatientGuideCardComponent, AdherenceTrendChartComponent, PatientAdherenceComponent],
    templateUrl: './patient-dashboard.component.html',
    styleUrls: ['./patient-dashboard.component.css'],
    animations: [
        trigger('fadeSlide', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateY(15px)' }),
                animate('400ms cubic-bezier(0.165, 0.84, 0.44, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
            ])
        ]),
        trigger('listAnimation', [
            transition('* <=> *', [
                query(':enter', [
                    style({ opacity: 0, transform: 'translateY(10px)' }),
                    stagger('60ms', animate('350ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })))
                ], { optional: true })
            ])
        ])
    ]
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
    auditTimelines: any[] = []; 
    currentPrescriptionAudit: any | null = null;
    adherenceLogs: any[] = []; // Store logs
    myAdherence30Days: number = 0;

    // Live Dose Alerts
    dueDoses: DoseLog[] = [];

    // Temporal Adherence Blocks
    adherenceBlocks: any[] = [];
    doseSlotBlocks: any[] = []; // NEW: Flattened list of individual dose slots
    selectedBlock: any = null;

    isUserMenuOpen = false;
    currentUser: User | null = null;
    showProfileModal = false;
    isEditingProfile = false;
    profileSaving = false;
    profileSuccess = false;
    profileForm: any = {};

    private pollSub?: Subscription;
    private doseCheckSub?: Subscription;
    private minDateRefreshInterval: any = null;

    // For Appointment Modal
    showAppointmentModal = false;
    newAppointmentDate: string = '';
    minAppointmentDate: string = '';
    newAppointmentDateOnly: string = '';
    minAppointmentDateOnly: string = '';
    newAppointmentTimeOnly: string = '';
    availableTimeSlots: string[] = [];
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
        private doseLogService: DoseLogService,
        private medScheduleService: MedScheduleService,
        private analyticsService: AnalyticsService
    ) { }

    ngOnInit(): void {
        this.killOverlays();
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
            else this.refreshOverallScore(); // If 0, fallback to API
        });
    }

    refreshOverallScore(): void {
        if (this.userId) {
            this.analyticsService.getOverallAdherenceScore(this.userId).subscribe({
                next: (score: number) => this.myAdherence30Days = score,
                error: (err: any) => console.error('Error fetching overall score', err)
            });
        }
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
                    const status = d.status;
                    if (status !== 'PENDING' && status !== 'SNOOZED') return false;
                    
                    // Show all pending doses for today, regardless of the exact current hour
                    // This serves as a "Today's Reminder" list
                    return true;
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
        this.refreshOverallScore();
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
                this.refreshOverallScore();
            },
            error: (err: any) => {
                console.error('Error fetching prescriptions', err);
                this.loading = false;
            }
        });

        this.prescriptionService.getMyAuditTimeline().subscribe({
            next: (data) => {
                console.log('Audit Timelines:', data);
                this.auditTimelines = data;
            },
            error: (err) => console.error('Error fetching audit timelines', err)
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

            this.adherenceService.getMyAdherenceTrend(14).subscribe({
                next: (trendData) => {
                    setTimeout(() => this.renderTrendChart(trendData), 100);
                },
                error: (err) => console.error('Error fetching adherence trend', err)
            });

            // Load temporal adherence blocks
            this.doseLogService.getAdherenceBlocks().subscribe({
                next: (blocks) => {
                    this.adherenceBlocks = blocks;
                    this.unrollAdherenceBlocks();
                },
                error: (err) => console.error('Error fetching adherence blocks', err)
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

    private getLocalDateTimeString(date: Date): string {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
        
        // Standard medical operational hours (08:00 to 21:00)
        for (let hour = 8; hour <= 21; hour++) {
            for (let min of ['00', '30']) {
                if (hour === 21 && min === '30') continue;
                
                const timeStr = `${hour.toString().padStart(2, '0')}:${min}`;
                
                if (isToday) {
                    // Filter out past times for today (with 15-minute lead buffer)
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

    openAppointmentModal(): void {
        this.showAppointmentModal = true;

        const now = new Date();
        this.minAppointmentDateOnly = this.getLocalDateString(now);

        // Default appointment date: tomorrow
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        this.newAppointmentDateOnly = this.getLocalDateString(tomorrow);
        this.availableTimeSlots = this.generateTimeSlots(this.newAppointmentDateOnly);
        
        // Default time slot: 09:00
        this.newAppointmentTimeOnly = '09:00';
        this.newAppointmentDate = `${this.newAppointmentDateOnly}T${this.newAppointmentTimeOnly}`;

        // Periodically refresh the time slot list to block slots that fall into the past
        if (this.minDateRefreshInterval) {
            clearInterval(this.minDateRefreshInterval);
        }
        this.minDateRefreshInterval = setInterval(() => {
            const currentNow = new Date();
            this.minAppointmentDateOnly = this.getLocalDateString(currentNow);
            
            if (this.isTodayDate(this.newAppointmentDateOnly)) {
                this.availableTimeSlots = this.generateTimeSlots(this.newAppointmentDateOnly);
                
                if (this.newAppointmentTimeOnly && !this.availableTimeSlots.includes(this.newAppointmentTimeOnly)) {
                    if (this.availableTimeSlots.length > 0) {
                        this.newAppointmentTimeOnly = this.availableTimeSlots[0];
                    } else {
                        // Switch to tomorrow if no slots remain today
                        const tomorrowDay = new Date(currentNow);
                        tomorrowDay.setDate(tomorrowDay.getDate() + 1);
                        this.newAppointmentDateOnly = this.getLocalDateString(tomorrowDay);
                        this.availableTimeSlots = this.generateTimeSlots(this.newAppointmentDateOnly);
                        this.newAppointmentTimeOnly = '09:00';
                    }
                }
                this.newAppointmentDate = `${this.newAppointmentDateOnly}T${this.newAppointmentTimeOnly}`;
            }
        }, 30000);
    }

    closeAppointmentModal(): void {
        this.showAppointmentModal = false;
        if (this.minDateRefreshInterval) {
            clearInterval(this.minDateRefreshInterval);
            this.minDateRefreshInterval = null;
        }
    }

    onAppointmentDateOnlyChange(): void {
        if (!this.newAppointmentDateOnly) return;
        
        const now = new Date();
        const todayStr = this.getLocalDateString(now);
        
        // Block choosing past dates
        if (this.newAppointmentDateOnly < todayStr) {
            this.newAppointmentDateOnly = todayStr;
        }
        
        this.availableTimeSlots = this.generateTimeSlots(this.newAppointmentDateOnly);
        
        // Auto-correct time selection if no longer valid
        if (this.availableTimeSlots.length > 0) {
            if (!this.availableTimeSlots.includes(this.newAppointmentTimeOnly)) {
                this.newAppointmentTimeOnly = this.availableTimeSlots[0];
            }
        } else {
            alert("No appointment slots are available for the rest of today. Advancing to tomorrow's slots.");
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            this.newAppointmentDateOnly = this.getLocalDateString(tomorrow);
            this.availableTimeSlots = this.generateTimeSlots(this.newAppointmentDateOnly);
            this.newAppointmentTimeOnly = '09:00';
        }
        
        this.newAppointmentDate = `${this.newAppointmentDateOnly}T${this.newAppointmentTimeOnly}`;
    }

    onAppointmentTimeOnlyChange(): void {
        this.newAppointmentDate = `${this.newAppointmentDateOnly}T${this.newAppointmentTimeOnly}`;
    }

    submitAppointment(): void {
        if (!this.userId) return;

        if (!this.newAppointmentDateOnly || !this.newAppointmentTimeOnly) {
            alert('Please select a valid date and time slot!');
            return;
        }

        // Construct final date value
        this.newAppointmentDate = `${this.newAppointmentDateOnly}T${this.newAppointmentTimeOnly}`;

        const selectedDate = new Date(this.newAppointmentDate);
        const now = new Date();
        if (selectedDate < now) {
            alert('Cannot request an appointment in the past!');
            return;
        }

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
        // Redirect to the granular Adherence Matrix as date-based logging is deprecated
        this.activeSection = 'adherence';
        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 150);
    }

    // --- Schedule Timers ---

    hasActiveSchedule(prescriptionId?: number): boolean {
        if (!prescriptionId) return false;
        return this.mySchedules.some(s => s.prescription && s.prescription.id === prescriptionId && s.status === 'ACTIVE');
    }

    openScheduleModal(prescription: Prescription): void {
        this.scheduleTargetPrescription = prescription;
        this.medScheduleService.getMealPrefs().subscribe({
            next: (prefs) => {
                if (prefs && prefs.breakfastTime) {
                    this.schedulePrefs = prefs;
                    if (this.schedulePrefs.breakfastTime.length > 5) this.schedulePrefs.breakfastTime = this.schedulePrefs.breakfastTime.substring(0, 5);
                    if (this.schedulePrefs.lunchTime.length > 5) this.schedulePrefs.lunchTime = this.schedulePrefs.lunchTime.substring(0, 5);
                    if (this.schedulePrefs.dinnerTime.length > 5) this.schedulePrefs.dinnerTime = this.schedulePrefs.dinnerTime.substring(0, 5);
                }
                this.showScheduleModal = true;
            },
            error: () => this.showScheduleModal = true // Open with defaults if error
        });
    }

    closeScheduleModal(): void {
        this.showScheduleModal = false;
        this.scheduleTargetPrescription = null;
    }

    submitSchedule(): void {
        if (!this.scheduleTargetPrescription || !this.scheduleTargetPrescription.id) return;

        const formatTime = (time: string | null | undefined) => {
            if (!time) return '08:00:00';
            if (time.length === 5) return time + ':00';
            if (time.length === 8) return time;
            return time;
        };

        const req: MedScheduleRequest = {
            prescriptionId: this.scheduleTargetPrescription.id,
            startDate: new Date().toISOString().split('T')[0],
            breakfastTime: formatTime(this.schedulePrefs.breakfastTime),
            lunchTime: formatTime(this.schedulePrefs.lunchTime),
            dinnerTime: formatTime(this.schedulePrefs.dinnerTime),
            preMealOffsetMinutes: this.schedulePrefs.preMealOffsetMinutes || 15
        };

        this.medScheduleService.createSchedule(req).subscribe({
            next: (res) => {
                alert('Schedule created successfully! Timers are now active.');
                this.closeScheduleModal();
                this.loadData();
                this.checkDueDoses();
            },
            error: (err) => {
                console.error('Error creating schedule', err);
                alert('Failed to create schedule. Please check console for details.');
            }
        });
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
        if (!prescription.items || prescription.items.length === 0 || !prescription.id) return 0;

        const item = prescription.items[0];
        if (!item.startDate) return 0;

        const today = new Date();
        const start = new Date(item.startDate);
        start.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        const endDateRaw = item.endDate ? this.parseDate(item.endDate) : null;
        const end = endDateRaw || new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        // Effective end for adherence calculation is today (clamped to course end)
        const effectiveEnd = today < end ? today : end;

        // Days elapsed so far in the course
        let elapsedDays = Math.floor((effectiveEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (elapsedDays < 1) elapsedDays = 1;

        const timings = item.dosageTiming ? item.dosageTiming.split(',') : ['Daily'];
        const totalExpectedSoFar = elapsedDays * timings.length;

        const logsCount = this.adherenceLogs.filter(l => l.prescription?.id === prescription.id).length;

        if (totalExpectedSoFar === 0) return 100; // Perfect if nothing expected yet
        return Math.min(100, Math.round((logsCount / totalExpectedSoFar) * 100));
    }

    getAdherenceBlocks(prescription: Prescription): { date: Date, taken: boolean }[] {
        if (!prescription.items || prescription.items.length === 0 || !prescription.id) return [];
        const item = prescription.items[0];

        const startDateRaw = item.startDate || prescription.createdAt;
        const start = this.parseDate(startDateRaw);
        if (!start) return [];

        start.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Show up to the last 7 days or since start date
        const blocks = [];
        const displayStart = new Date(today);
        displayStart.setDate(today.getDate() - 6);

        const effectiveStart = start > displayStart ? start : displayStart;

        for (let d = new Date(effectiveStart); d <= today; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const taken = this.adherenceLogs.some(log => {
                const logDateRaw = log.takenAt || log.createdAt;
                const logDate = this.parseDate(logDateRaw);
                return log.prescription?.id === prescription.id && logDate && logDate.toISOString().split('T')[0] === dateStr;
            });
            blocks.push({
                date: new Date(d),
                taken: taken
            });
        }
        return blocks;
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
        
        // Try to find the enriched timeline first
        const enriched = this.auditTimelines.find(t => t.prescriptionId === id);
        if (enriched) {
            this.currentPrescriptionAudit = enriched;
            this.selectedHistory = enriched.versions; // For compatibility with existing logic if needed
            return;
        }

        // Fallback to basic history if not found in pre-loaded timelines
        this.prescriptionService.getAuditHistory(id).subscribe({
            next: (data) => {
                this.selectedHistory = data;
                this.currentPrescriptionAudit = null;
            },
            error: (err) => console.error('Failed to load history', err)
        });
    }

    closeHistory(): void {
        this.selectedHistory = null;
        this.currentPrescriptionAudit = null;
    }

    toggleUserMenu(): void {
        this.isUserMenuOpen = !this.isUserMenuOpen;
    }

    openProfileModal(): void {
        this.isUserMenuOpen = false;
        this.isEditingProfile = false;
        this.profileSuccess = false;
        // Refresh from localStorage each time we open
        this.currentUser = this.authService.getProfile();
        this.profileForm = {
            fullName: this.currentUser?.fullName || '',
            phone: (this.currentUser as any)?.phone || '',
            address: (this.currentUser as any)?.address || '',
            medicalHistory: this.currentUser?.medicalHistory || '',
            allergies: (this.currentUser as any)?.allergies || ''
        };
        this.showProfileModal = true;
    }

    toggleEditProfile(): void {
        this.isEditingProfile = !this.isEditingProfile;
        this.profileSuccess = false;
    }

    saveProfile(): void {
        this.profileSaving = true;
        this.profileSuccess = false;
        this.authService.updateProfile(this.profileForm).subscribe({
            next: (res: any) => {
                this.profileSaving = false;
                this.profileSuccess = true;
                this.isEditingProfile = false;
                // Refresh component state with updated user
                this.currentUser = this.authService.getProfile();
                this.userName = this.currentUser?.fullName || 'Patient';
            },
            error: (err: any) => {
                this.profileSaving = false;
                console.error('Profile update failed', err);
                alert('Failed to update profile. Please try again.');
            }
        });
    }

    logout(): void {
        this.authService.logout();
    }

    // ── Temporal Adherence Block Helpers ─────────────────────────────

    isToday(dateStr: string): boolean {
        const d = new Date(dateStr);
        const today = new Date();
        return d.getFullYear() === today.getFullYear() &&
            d.getMonth() === today.getMonth() &&
            d.getDate() === today.getDate();
    }

    formatBlockDate(dateStr: string): string {
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    formatBlockDateFull(dateStr: string): string {
        const d = new Date(dateStr);
        return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }

    selectAdherenceBlock(block: any): void {
        this.selectedBlock = this.selectedBlock?.date === block.date ? null : block;
    }

    private unrollAdherenceBlocks(): void {
        const unrolled: any[] = [];
        const mealPriority: { [key: string]: number } = {
            'BREAKFAST': 1,
            'LUNCH': 2,
            'DINNER': 3
        };

        this.adherenceBlocks.forEach(day => {
            if (day.doses && day.doses.length > 0) {
                day.doses.forEach((dose: any) => {
                    unrolled.push({
                        ...dose,
                        dayLabel: day.dayLabel,
                        date: day.date,
                        uniqueId: `${day.date}_${dose.doseId}`
                    });
                });
            } else {
                unrolled.push({
                    date: day.date,
                    dayLabel: day.dayLabel,
                    status: day.dailyAdherence === 100 ? 'TAKEN' : (day.dailyAdherence > 0 ? 'PARTIAL' : 'PENDING'),
                    medicineName: 'Medication',
                    mealSlot: 'Daily',
                    dosage: 'Scheduled',
                    weight: day.weightPerDose,
                    isPlaceholder: true
                });
            }
        });

        // Sort: Date DESC (latest first), then Meal Slot ASC (Breakfast -> Lunch -> Dinner)
        unrolled.sort((a, b) => {
            const dateA = new Date(a.scheduledTime || a.date).getTime();
            const dateB = new Date(b.scheduledTime || b.date).getTime();
            
            if (dateA !== dateB) {
                return dateB - dateA; // Date Descending
            }
            
            const pA = mealPriority[(a.mealSlot || '').toUpperCase()] || 99;
            const pB = mealPriority[(b.mealSlot || '').toUpperCase()] || 99;
            return pA - pB; // Meal Slot Ascending
        });

        this.doseSlotBlocks = unrolled;
    }

    isBlockLoggable(block: any): boolean {
        if (!block || block.status === 'TAKEN') return false;
        
        // Block future doses
        const now = new Date();
        const schedTime = new Date(block.scheduledTime || block.date);
        
        // If scheduledTime is in the future, don't allow logging
        return schedTime <= now;
    }

    markBlockDose(dose: any, status: string): void {
        this.doseLogService.markDose(dose.doseId, status).subscribe({
            next: (updated) => {
                dose.status = updated.status;
                // Recalculate block adherence
                if (this.selectedBlock) {
                    const takenNow = this.selectedBlock.doses.filter((d: any) => d.status === 'TAKEN').length;
                    const total = this.selectedBlock.totalDoses;
                    this.selectedBlock.takenCount = takenNow;
                    this.selectedBlock.dailyAdherence = total > 0
                        ? Math.round((takenNow * 100 / total) * 10) / 10 : 0;

                    // Update in the main list
                    const blockInList = this.adherenceBlocks.find((b: any) => b.date === this.selectedBlock.date);
                    if (blockInList) {
                        blockInList.takenCount = takenNow;
                        blockInList.dailyAdherence = this.selectedBlock.dailyAdherence;
                    }

                    // Sync the unrolled list as well
                    const slotInUnrolled = this.doseSlotBlocks.find(d => d.doseId === dose.doseId);
                    if (slotInUnrolled) {
                        slotInUnrolled.status = updated.status;
                    }
                } else {
                    // If no selectedBlock (clicked from the unrolled view directly)
                    const slotInUnrolled = this.doseSlotBlocks.find(d => d.doseId === dose.doseId);
                    if (slotInUnrolled) {
                        slotInUnrolled.status = updated.status;
                    }
                    
                    // Update the corresponding day in adherenceBlocks to reflect the new adherence %
                    const dayDate = dose.scheduledTime?.split('T')[0] || dose.date;
                    const dayBlock = this.adherenceBlocks.find(b => b.date === dayDate);
                    if (dayBlock) {
                        const dInDay = dayBlock.doses.find((sd: any) => sd.doseId === dose.doseId);
                        if (dInDay) dInDay.status = updated.status;
                        
                        const tCount = dayBlock.doses.filter((sd: any) => sd.status === 'TAKEN').length;
                        dayBlock.takenCount = tCount;
                        dayBlock.dailyAdherence = dayBlock.totalDoses > 0 
                            ? Math.round((tCount * 100 / dayBlock.totalDoses) * 10) / 10 : 0;
                    }
                }
                
                // Refresh overall adherence from server truth
                this.doseLogService.getMyAdherenceStats().subscribe(stats => {
                    this.myAdherence30Days = stats.percent;
                    this.adherenceService.setLiveAdherence(stats.percent);
                });

                // Locally recalculate or re-fetch detailed logs if needed for medication breakdown
                this.adherenceService.getPatientLogs(this.userId!).subscribe(logs => {
                    this.adherenceLogs = logs;
                    this.calculateOverallAdherence();
                });

                this.adherenceService.triggerInstantIncrement(15);
            },
            error: () => alert('Failed to mark dose.')
        });
    }

    getCardAccent(actionType: string): string {
        if (!actionType) return '#4f8ef7';
        switch (actionType.toUpperCase()) {
            case 'DISPENSED': return '#22c55e';
            case 'RENEWED': return '#a855f7';
            default: return '#4f8ef7';
        }
    }

    getCardGlow(actionType: string): string {
        switch ((actionType || '').toUpperCase()) {
            case 'DISPENSED': return 'rgba(34, 197, 94, 0.12)';
            case 'RENEWED': return 'rgba(168, 85, 247, 0.12)';
            default: return 'rgba(79, 142, 247, 0.12)';
        }
    }

    getBadgeClass(actionType: string): string {
        switch ((actionType || '').toUpperCase()) {
            case 'DISPENSED': return 'badge-success';
            case 'RENEWED': return 'badge-purple';
            default: return 'badge-apollo';
        }
    }

    killOverlays(): void {
        console.log('Patient UI Emergency Reset Triggered');
        this.selectedHistory = null;
        this.currentPrescriptionAudit = null;
        this.showAppointmentModal = false;
        this.showScheduleModal = false;
        this.showProfileModal = false;
        this.selectedBlock = null;
        this.isUserMenuOpen = false;
        if (this.minDateRefreshInterval) {
            clearInterval(this.minDateRefreshInterval);
            this.minDateRefreshInterval = null;
        }

        // Force clean global DOM
        document.body.style.filter = 'none';
        document.body.style.overflow = 'auto';
        document.body.classList.remove('modal-open');

        // Hide any orphaned backdrops
        const overlays = ['.modal-backdrop', '.drawer-overlay', '.m-360-overlay', '.backdrop', '.glass-overlay'];
        overlays.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => (el as HTMLElement).style.display = 'none');
        });
    }
}

