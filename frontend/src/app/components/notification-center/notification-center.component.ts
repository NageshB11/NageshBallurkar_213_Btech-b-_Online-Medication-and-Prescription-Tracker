import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService, Notification } from '../../services/notification.service';

@Component({
    selector: 'app-notification-center',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './notification-center.component.html',
    styleUrl: './notification-center.component.css'
})
export class NotificationCenterComponent implements OnInit {
    notifications: Notification[] = [];
    loading = true;

    constructor(private notificationService: NotificationService) { }

    ngOnInit(): void {
        this.loadNotifications();
    }

    loadNotifications(): void {
        this.loading = true;
        this.notificationService.getMyNotifications().subscribe({
            next: (data) => {
                this.notifications = data;
                this.loading = false;
            },
            error: (err: any) => {
                console.error('Error loading notifications', err);
                this.loading = false;
            }
        });
    }

    markAsRead(id: number): void {
        this.notificationService.markAsRead(id).subscribe({
            next: () => {
                const notif = this.notifications.find(n => n.id === id);
                if (notif) notif.read = true;
            },
            error: (err) => console.error('Error marking as read', err)
        });
    }
}
