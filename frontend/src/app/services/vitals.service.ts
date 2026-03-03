import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface HealthVitals {
    id?: number;
    patientId?: number;
    recordDate?: string;
    systolicBP?: number;
    diastolicBP?: number;
    heartRate?: number;
    temperature?: number;
    oxygenLevel?: number;
}

@Injectable({
    providedIn: 'root'
})
export class VitalsService {
    private apiUrl = 'http://localhost:8081/api/vitals';

    constructor(private http: HttpClient, private authService: AuthService) { }

    private getHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        return new HttpHeaders().set('Authorization', `Bearer ${token}`);
    }

    addVitals(vitals: HealthVitals): Observable<string> {
        return this.http.post<string>(this.apiUrl, vitals, { headers: this.getHeaders(), responseType: 'text' as 'json' });
    }

    getMyVitals(): Observable<HealthVitals[]> {
        return this.http.get<HealthVitals[]>(`${this.apiUrl}/my`, { headers: this.getHeaders() });
    }

    getPatientVitals(patientId: number): Observable<HealthVitals[]> {
        return this.http.get<HealthVitals[]>(`${this.apiUrl}/patient/${patientId}`, { headers: this.getHeaders() });
    }
}
