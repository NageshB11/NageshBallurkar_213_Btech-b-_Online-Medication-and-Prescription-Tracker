import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentService } from '../../services/appointment.service';
import { Appointment, AppointmentStatus } from '../../models/appointment.model';
import { Router } from '@angular/router';

@Component({
    selector: 'app-doctor-appointments',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './doctor-appointments.component.html',
    styleUrls: ['./doctor-appointments.component.css']
})
export class DoctorAppointmentsComponent implements OnInit {
    appointments: Appointment[] = [];
    statusBadges: { [key in AppointmentStatus]: string } = {
        [AppointmentStatus.REQUESTED]: 'status-pill status-requested',
        [AppointmentStatus.APPROVED]: 'status-pill status-approved',
        [AppointmentStatus.REJECTED]: 'status-pill status-rejected',
        [AppointmentStatus.COMPLETED]: 'status-pill status-completed',
        [AppointmentStatus.CANCELLED]: 'status-pill status-muted'
    };

    // Rescheduling Modal fields
    showRescheduleModal = false;
    rescheduleTargetAppointment: Appointment | null = null;
    rescheduleDateOnly: string = '';
    rescheduleTimeOnly: string = '';
    rescheduleNotes: string = '';
    availableTimeSlots: string[] = [];
    minAppointmentDateOnly: string = '';

    constructor(private appointmentService: AppointmentService, private router: Router) { }

    ngOnInit(): void {
        this.loadAppointments();
    }

    loadAppointments(): void {
        this.appointmentService.getDoctorAppointments().subscribe({
            next: (data) => this.appointments = data,
            error: (err) => console.error('Failed to load appointments', err)
        });
    }

    approve(id: number): void {
        this.appointmentService.approveAppointment(id).subscribe(() => this.loadAppointments());
    }

    reject(id: number): void {
        this.appointmentService.rejectAppointment(id).subscribe(() => this.loadAppointments());
    }

    issuePrescription(email: string | undefined): void {
        if (email) {
            this.router.navigate(['/issue-prescription'], { queryParams: { patientEmail: email } });
        } else {
            this.router.navigate(['/issue-prescription']);
        }
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
        if (!appt.appointmentDate || appt.status === AppointmentStatus.REJECTED || appt.status === AppointmentStatus.CANCELLED) return false;
        const apptTime = new Date(appt.appointmentDate).getTime();
        return this.appointments.some(other => 
            other.id !== appt.id &&
            other.status !== AppointmentStatus.REJECTED &&
            other.status !== AppointmentStatus.CANCELLED &&
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
}

