import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private apiUrl = '/api/admin';

    constructor(private http: HttpClient) { }

    private getHeaders() {
        const token = localStorage.getItem('authToken');
        return new HttpHeaders().set('Authorization', `Bearer ${token}`);
    }

    getStats(): Observable<any> {
        return this.http.get(`${this.apiUrl}/stats`, { headers: this.getHeaders() });
    }

    getAllUsers(): Observable<User[]> {
        return this.http.get<User[]>(`${this.apiUrl}/users`, { headers: this.getHeaders() });
    }

    getAudits(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/audits`, { headers: this.getHeaders() });
    }

    verifyUser(userId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/verify/${userId}`, {}, { headers: this.getHeaders() });
    }

    rejectUser(userId: number): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/reject/${userId}`, { headers: this.getHeaders() });
    }

    toggleUserStatus(userId: number): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/users/${userId}/toggle-status`, {}, { headers: this.getHeaders() });
    }

    getSystemAudits(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/system-audits`, { headers: this.getHeaders() });
    }

    getPrescriptionAuditLogs(prescriptionId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/audit-logs/${prescriptionId}`, { headers: this.getHeaders() });
    }

    getPrescriptionTrace(prescriptionId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/prescription-trace/${prescriptionId}`, { headers: this.getHeaders() });
    }

    getAllPatients(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/patients`, { headers: this.getHeaders() });
    }

    getPatientAuditTimeline(patientId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/audit/patient/${patientId}`, { headers: this.getHeaders() });
    }

    exportOfficialAudit(type: string = 'AUDIT', startDate?: string, endDate?: string): Observable<Blob> {
        let params = new HttpParams().set('type', type);
        if (startDate) params = params.set('start', startDate);
        if (endDate) params = params.set('end', endDate);

        return this.http.get(`${this.apiUrl}/reports/export`, {
            headers: this.getHeaders(),
            params,
            responseType: 'blob'
        });
    }

    updateUserProfile(userId: number, details: any): Observable<User> {
        return this.http.put<User>(`${this.apiUrl}/users/${userId}/update-profile`, details, { headers: this.getHeaders() });
    }

    resetPassword(userId: number): Observable<User> {
        return this.http.post<User>(`${this.apiUrl}/users/${userId}/reset-password`, {}, { headers: this.getHeaders() });
    }

    getUserAuditTrace(userId: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/users/${userId}/audit-trace`, { headers: this.getHeaders() });
    }

    getDoctorPrescriptions(doctorId: number): Observable<any[]> {
        // This endpoint was added to PrescriptionController
        return this.http.get<any[]>(`/api/prescriptions/admin/doctors/${doctorId}/prescriptions`, { headers: this.getHeaders() });
    }
}
