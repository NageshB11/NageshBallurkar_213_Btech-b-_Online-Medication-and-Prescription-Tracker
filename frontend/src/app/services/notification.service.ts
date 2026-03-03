import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Notification {
    id: number;
    message: string;
    userId: number;
    read: boolean;
    createdAt: string;
    type: string;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private apiUrl = 'http://localhost:8081/api/notifications';

    constructor(private http: HttpClient) { }

    getMyNotifications(): Observable<Notification[]> {
        const token = localStorage.getItem('authToken');
        const headers = { 'Authorization': `Bearer ${token}` };
        return this.http.get<Notification[]>(this.apiUrl, { headers });
    }

    markAsRead(id: number): Observable<Notification> {
        const token = localStorage.getItem('authToken');
        const headers = { 'Authorization': `Bearer ${token}` };
        return this.http.put<Notification>(`${this.apiUrl}/${id}/read`, {}, { headers });
    }
}
