import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { Prescription } from '../models/prescription.model';

export interface RenewalRequest {
    id: number;
    prescription: Prescription;
    status: 'PENDING' | 'APPROVED' | 'DENIED';
    requestDate: string;
    doctorComments?: string;
}

@Injectable({
    providedIn: 'root'
})
export class RenewalService {
    private apiUrl = 'http://localhost:8081/api/renewals';
    private doctorUrl = 'http://localhost:8081/api/doctor/renewals';

    constructor(private http: HttpClient, private authService: AuthService) { }

    private getHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        return new HttpHeaders().set('Authorization', `Bearer ${token}`);
    }

    requestRenewal(prescriptionId: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/request/${prescriptionId}`, {}, { headers: this.getHeaders(), responseType: 'text' });
    }

    getMyRenewals(): Observable<RenewalRequest[]> {
        return this.http.get<RenewalRequest[]>(`${this.apiUrl}/my`, { headers: this.getHeaders() });
    }

    getDoctorRenewalRequests(): Observable<RenewalRequest[]> {
        return this.http.get<RenewalRequest[]>(this.doctorUrl, { headers: this.getHeaders() });
    }

    updateRenewalStatus(id: number, status: string, comments?: string): Observable<any> {
        return this.http.post(`${this.doctorUrl}/${id}/${status}`, comments, { headers: this.getHeaders(), responseType: 'text' });
    }
}
