import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PatientMealPrefs {
    id?: number;
    breakfastTime: string; // "HH:mm"
    lunchTime: string;
    dinnerTime: string;
    preMealOffsetMinutes?: number;
}

export interface ScheduleItemRequest {
    prescriptionItemId?: number;
    medicineId?: number;
    medicineName: string;
    dosage: string;
    frequency: 'DAILY' | 'ALTERNATE_DAY' | 'WEEKLY' | 'CUSTOM';
    daysOfWeek?: string;
    durationDays?: number;
    instructions?: string;
}

export interface MedScheduleRequest {
    prescriptionId: number;
    scheduleName?: string;
    startDate: string;
    breakfastTime: string;
    lunchTime: string;
    dinnerTime: string;
    preMealOffsetMinutes?: number;
    items?: ScheduleItemRequest[];
}

export interface MedicationSchedule {
    id: number;
    scheduleName: string;
    status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
    startDate: string;
    endDate?: string;
    createdAt: string;
    patient?: any;
    prescription?: any;
}

export interface ScheduleAudit {
    id: number;
    changeType: string;
    changeSummary: string;
    versionLabel: string;
    changedAt: string;
    changedBy?: any;
}

@Injectable({ providedIn: 'root' })
export class MedScheduleService {
    private base = 'http://localhost:8081/api/schedules';

    constructor(private http: HttpClient) { }

    getMealPrefs(): Observable<PatientMealPrefs> {
        return this.http.get<PatientMealPrefs>(`${this.base}/meal-prefs`);
    }

    saveMealPrefs(prefs: PatientMealPrefs): Observable<PatientMealPrefs> {
        return this.http.post<PatientMealPrefs>(`${this.base}/meal-prefs`, prefs);
    }

    createSchedule(req: MedScheduleRequest): Observable<MedicationSchedule> {
        return this.http.post<MedicationSchedule>(this.base, req);
    }

    getMySchedules(): Observable<MedicationSchedule[]> {
        return this.http.get<MedicationSchedule[]>(`${this.base}/my`);
    }

    getScheduleById(id: number): Observable<MedicationSchedule> {
        return this.http.get<MedicationSchedule>(`${this.base}/${id}`);
    }

    updateStatus(id: number, status: string): Observable<MedicationSchedule> {
        return this.http.patch<MedicationSchedule>(`${this.base}/${id}/status`, null, {
            params: { status }
        });
    }

    getPatientSchedules(patientId: number): Observable<MedicationSchedule[]> {
        return this.http.get<MedicationSchedule[]>(`${this.base}/patient/${patientId}`);
    }

    getScheduleAudit(scheduleId: number): Observable<ScheduleAudit[]> {
        return this.http.get<ScheduleAudit[]>(`${this.base}/${scheduleId}/audit`);
    }
}
