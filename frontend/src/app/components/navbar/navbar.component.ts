import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
    isLoggedIn = false;
    userRole: string | null = null;
    fullName: string | null = null;
    unreadCount = 0;
    private pollingInterval: any;

    constructor(
        private authService: AuthService,
        private notificationService: NotificationService
    ) { }

    ngOnInit(): void {
        this.authService.currentUser$.subscribe(loggedIn => {
            this.isLoggedIn = loggedIn;
            if (loggedIn) {
                this.userRole = this.authService.getRole();
                const name = this.authService.getFullName();
                this.fullName = (name && name !== 'undefined' && name !== 'null') ? name : 'User';
                this.loadNotifications();
                this.startPolling();
            } else {
                this.userRole = null;
                this.fullName = null;
                this.unreadCount = 0;
                this.stopPolling();
            }
        });
    }

    ngOnDestroy(): void {
        this.stopPolling();
    }

    startPolling(): void {
        this.stopPolling();
        this.pollingInterval = setInterval(() => {
            if (this.isLoggedIn) {
                this.loadNotifications();
            }
        }, 10000); // Poll every 10 seconds
    }

    stopPolling(): void {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
    }

    loadNotifications(): void {
        this.notificationService.getMyNotifications().subscribe({
            next: (data) => {
                this.unreadCount = data.filter(n => !n.read).length;
            },
            error: (err) => console.error('Failed to load notifications', err)
        });
    }

    logout(): void {
        this.stopPolling();
        this.authService.logout();
    }
}
