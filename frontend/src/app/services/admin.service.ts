import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private apiUrl = 'http://localhost:8081/api/admin';

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
}
