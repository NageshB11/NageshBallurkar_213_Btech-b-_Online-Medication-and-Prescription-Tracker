import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DoseLog {
    doseId: number;
    medicineName: string;
    dosage: string;
    mealSlot: string;       // BREAKFAST | LUNCH | DINNER | CUSTOM
    foodInstruction: string;
    displayLabel: string;   // "After Breakfast"
    mealSlotIcon: string;   // "🌅" | "☀️" | "🌙"
    scheduledTime: string;
    actualTime?: string;
    snoozedUntil?: string;   // null if not snoozed
    snoozeCount: number;     // number of times snoozed
    status: 'PENDING' | 'TAKEN' | 'MISSED' | 'SKIPPED' | 'SNOOZED';
    notes?: string;
    scheduleItemId: number;
}

@Injectable({ providedIn: 'root' })
export class DoseLogService {
    private base = 'http://localhost:8081/api/doses';

    constructor(private http: HttpClient) { }

    getTodaysDoses(): Observable<DoseLog[]> {
        return this.http.get<DoseLog[]>(`${this.base}/today`);
    }

    markDose(doseId: number, status: string, notes?: string): Observable<DoseLog> {
        const params: any = { status };
        if (notes) params['notes'] = notes;
        return this.http.post<DoseLog>(`${this.base}/${doseId}/mark`, null, { params });
    }

    snoozeDose(doseId: number): Observable<DoseLog> {
        return this.http.post<DoseLog>(`${this.base}/${doseId}/snooze`, null);
    }

    getMyAdherenceStats(): Observable<{ percent: number, label: string }> {
        return this.http.get<{ percent: number, label: string }>(`http://localhost:8081/api/analytics/schedules/my-adherence`);
    }

    getDoseHistory(): Observable<DoseLog[]> {
        return this.http.get<DoseLog[]>(`${this.base}/history`);
    }
}
