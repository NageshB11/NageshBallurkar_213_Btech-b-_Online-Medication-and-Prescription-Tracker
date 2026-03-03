import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Appointment } from '../models/appointment.model';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class AppointmentService {
    private apiUrl = 'http://localhost:8081/api/appointments';

    constructor(private http: HttpClient, private authService: AuthService) { }

    private getHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
    }

    requestAppointment(appointment: any): Observable<Appointment> {
        return this.http.post<Appointment>(`${this.apiUrl}/request`, appointment, { headers: this.getHeaders() });
    }

    approveAppointment(id: number): Observable<Appointment> {
        return this.http.put<Appointment>(`${this.apiUrl}/${id}/approve`, {}, { headers: this.getHeaders() });
    }

    rejectAppointment(id: number): Observable<Appointment> {
        return this.http.put<Appointment>(`${this.apiUrl}/${id}/reject`, {}, { headers: this.getHeaders() });
    }

    getDoctorAppointments(): Observable<Appointment[]> {
        return this.http.get<Appointment[]>(`${this.apiUrl}/doctor/me`, { headers: this.getHeaders() });
    }

    getPatientAppointments(patientId: number): Observable<Appointment[]> {
        return this.http.get<Appointment[]>(`${this.apiUrl}/patient/${patientId}`, { headers: this.getHeaders() });
    }
}
