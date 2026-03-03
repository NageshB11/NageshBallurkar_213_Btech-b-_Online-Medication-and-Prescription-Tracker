import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Prescription } from '../models/prescription.model';

import { PrescriptionAudit } from '../models/prescription-audit.model';

@Injectable({
    providedIn: 'root'
})
export class PrescriptionService {
    private apiUrl = 'http://localhost:8081/api/prescriptions';

    constructor(private http: HttpClient) { }


    createPrescription(prescription: Prescription): Observable<Prescription> {
        const token = localStorage.getItem('authToken');
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        return this.http.post<Prescription>(this.apiUrl, prescription, { headers });
    }

    uploadPrescription(formData: FormData): Observable<Prescription> {
        const token = localStorage.getItem('authToken');
        const headers = {
            'Authorization': `Bearer ${token}`
            // Note: Content-Type is intentionally omitted so the browser can automatically set the correct boundary for multipart/form-data
        };

        return this.http.post<Prescription>(`${this.apiUrl}/upload`, formData, { headers });
    }

    updatePrescription(id: number, prescription: Prescription, changeReason: string, modifiedBy: string): Observable<Prescription> {
        return this.http.put<Prescription>(`${this.apiUrl}/${id}?changeReason=${changeReason}&modifiedBy=${modifiedBy}`, prescription, { headers: this.getHeaders() });
    }

    validatePrescription(id: number, pharmacistId?: number): Observable<Prescription> {
        let url = `${this.apiUrl}/${id}/validate`;
        if (pharmacistId) {
            url += `?pharmacistId=${pharmacistId}`;
        }
        return this.http.post<Prescription>(url, {}, { headers: this.getHeaders() });
    }

    getPrescription(id: number): Observable<Prescription> {
        const token = localStorage.getItem('authToken');
        const headers = { 'Authorization': `Bearer ${token}` };
        return this.http.get<Prescription>(`${this.apiUrl}/${id}`, { headers });
    }

    getMyPrescriptions(): Observable<Prescription[]> {
        const token = localStorage.getItem('authToken');
        const headers = { 'Authorization': `Bearer ${token}` };
        return this.http.get<Prescription[]>(`${this.apiUrl}/my-prescriptions`, { headers });
    }

    getIssuedPrescriptions(): Observable<Prescription[]> {
        const token = localStorage.getItem('authToken');
        const headers = { 'Authorization': `Bearer ${token}` };
        return this.http.get<Prescription[]>(`${this.apiUrl}/issued`, { headers });
    }

    getPharmacistQueue(): Observable<Prescription[]> {
        const token = localStorage.getItem('authToken');
        const headers = { 'Authorization': `Bearer ${token}` };
        return this.http.get<Prescription[]>(`${this.apiUrl}/pharmacist-queue`, { headers });
    }

    getAuditHistory(id: number): Observable<PrescriptionAudit[]> {
        const token = localStorage.getItem('authToken');
        const headers = { 'Authorization': `Bearer ${token}` };
        return this.http.get<PrescriptionAudit[]>(`${this.apiUrl}/${id}/audit`, { headers });
    }

    downloadPrescription(id: number): Observable<Blob> {
        const token = localStorage.getItem('authToken');
        const headers = { 'Authorization': `Bearer ${token}` };
        return this.http.get(`${this.apiUrl}/download/${id}`, {
            headers: headers,
            responseType: 'blob'
        });
    }

    getDoctorAnalytics(): Observable<any> {
        const headers = this.getHeaders();
        return this.http.get<any>(`${this.apiUrl}/analytics`, { headers });
    }

    getPatients(): Observable<any[]> {
        const headers = this.getHeaders();
        return this.http.get<any[]>(`${this.apiUrl}/patients`, { headers });
    }

    getPrescriptionsByPatientId(patientId: number): Observable<Prescription[]> {
        const headers = this.getHeaders();
        return this.http.get<Prescription[]>(`${this.apiUrl}/patients/${patientId}/prescriptions`, { headers });
    }

    private getHeaders(): HttpHeaders {
        const token = localStorage.getItem('authToken');
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    }
}
