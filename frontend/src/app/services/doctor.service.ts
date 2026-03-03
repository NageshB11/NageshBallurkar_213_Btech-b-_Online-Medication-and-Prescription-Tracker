import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface PatientRisk {
    patientId: number;
    patientName: string;
    adherenceScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    missedDoses: number;
    lastPharmacistName?: string;
    lastDispensedAt?: string;
}

export interface DoctorUser {
    id: number;
    fullName: string;
    email: string;
    specialization?: string;
}

@Injectable({
    providedIn: 'root'
})
export class DoctorService {
    private apiUrl = 'http://localhost:8081/api/doctor';

    constructor(private http: HttpClient, private authService: AuthService) { }

    private getHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        return new HttpHeaders().set('Authorization', `Bearer ${token}`);
    }

    getPatientsByRisk(): Observable<PatientRisk[]> {
        return this.http.get<PatientRisk[]>(`${this.apiUrl}/patients/risk`, { headers: this.getHeaders() });
    }

    getAllDoctors(): Observable<DoctorUser[]> {
        return this.http.get<DoctorUser[]>(`${this.apiUrl}/all`, { headers: this.getHeaders() });
    }
}
