import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Prescription } from '../models/prescription.model';

@Injectable({
    providedIn: 'root'
})
export class PharmacistService {
    private apiUrl = 'http://localhost:8081/api/pharmacist';

    constructor(private http: HttpClient) { }

    private getHeaders(): HttpHeaders {
        const token = localStorage.getItem('authToken');
        return new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    }

    getPrescription(id: number): Observable<Prescription> {
        return this.http.get<Prescription>(`${this.apiUrl}/prescriptions/${id}`, { headers: this.getHeaders() });
    }

    getAllPharmacists(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/all`, { headers: this.getHeaders() });
    }

    acceptPrescription(id: number): Observable<Prescription> {
        return this.http.patch<Prescription>(`${this.apiUrl}/accept/${id}`, {}, { headers: this.getHeaders() });
    }

    dispensePrescription(id: number): Observable<Prescription> {
        return this.http.patch<Prescription>(`${this.apiUrl}/dispense/${id}`, {}, { headers: this.getHeaders() });
    }

    downloadPrescription(id: number): Observable<Blob> {
        return this.http.get(`http://localhost:8081/api/prescriptions/download/${id}`, {
            headers: this.getHeaders(),
            responseType: 'blob'
        });
    }

    getPrescriptionsByPatient(patientId: number): Observable<Prescription[]> {
        return this.http.get<Prescription[]>(`${this.apiUrl}/patient/${patientId}`, { headers: this.getHeaders() });
    }

    requestClarification(id: number, reason: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/prescriptions/${id}/clarification`, reason, {
            headers: this.getHeaders(),
            responseType: 'text'
        });
    }

    getInventory(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/inventory`, { headers: this.getHeaders() });
    }

    updateInventory(medicine: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/inventory/update`, medicine, { headers: this.getHeaders() });
    }
}
