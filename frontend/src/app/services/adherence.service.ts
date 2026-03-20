import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { AdherenceLog } from '../models/adherence-log.model';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class AdherenceService {
    private apiUrl = 'http://localhost:8081/api/adherence';

    // RxJS State Management for Instant 25% Increments
    private liveAdherenceSubject = new BehaviorSubject<number>(0);
    public liveAdherence$ = this.liveAdherenceSubject.asObservable();

    constructor(private http: HttpClient, private authService: AuthService) { }

    setLiveAdherence(val: number): void {
        this.liveAdherenceSubject.next(val);
    }

    triggerInstantIncrement(amount: number = 25): void {
        const current = this.liveAdherenceSubject.getValue();
        this.liveAdherenceSubject.next(Math.min(100, current + amount));
    }

    private getHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
    }

    logAdherence(patientId: number, prescriptionId: number): Observable<AdherenceLog> {
        return this.http.post<AdherenceLog>(`${this.apiUrl}/log`, { patientId, prescriptionId }, { headers: this.getHeaders() });
    }

    getPatientLogs(patientId: number): Observable<AdherenceLog[]> {
        return this.http.get<AdherenceLog[]>(`${this.apiUrl}/patient/${patientId}`, { headers: this.getHeaders() });
    }

    getPatientAdherenceScore(patientId: number): Observable<{ score: number, patientId: number }> {
        return this.http.get<{ score: number, patientId: number }>(`${this.apiUrl}/patient/${patientId}/score`, { headers: this.getHeaders() });
    }
}
