import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppointmentService } from '../../services/appointment.service';
import { Appointment, AppointmentStatus } from '../../models/appointment.model';
import { Router } from '@angular/router';

@Component({
    selector: 'app-doctor-appointments',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './doctor-appointments.component.html',
    styleUrls: ['./doctor-appointments.component.css']
})
export class DoctorAppointmentsComponent implements OnInit {
    appointments: Appointment[] = [];
    statusBadges: { [key in AppointmentStatus]: string } = {
        [AppointmentStatus.REQUESTED]: 'bg-yellow-100 text-yellow-800',
        [AppointmentStatus.APPROVED]: 'bg-green-100 text-green-800',
        [AppointmentStatus.REJECTED]: 'bg-red-100 text-red-800',
        [AppointmentStatus.COMPLETED]: 'bg-blue-100 text-blue-800',
        [AppointmentStatus.CANCELLED]: 'bg-gray-100 text-gray-800'
    };

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
}
