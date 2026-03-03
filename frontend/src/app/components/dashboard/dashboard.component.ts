import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  userRole: string | null = '';
  fullName: string | null = '';
  unreadCount: number = 0;
  private pollSub?: Subscription;

  constructor(private authService: AuthService, private router: Router, private notificationService: NotificationService) { }

  ngOnInit(): void {
    this.userRole = this.authService.getRole();
    const name = this.authService.getFullName();
    this.fullName = (name && name !== 'undefined' && name !== 'null') ? name : 'User';

    this.fetchNotifications();
    this.pollSub = interval(10000).subscribe(() => this.fetchNotifications());
  }

  fetchNotifications(): void {
    this.notificationService.getMyNotifications().subscribe({
      next: (notes) => this.unreadCount = notes.filter(n => !n.read).length,
      error: (err) => console.error(err)
    });
  }

  ngOnDestroy(): void {
    if (this.pollSub) this.pollSub.unsubscribe();
  }

  logout(): void {
    this.authService.logout();
  }
}
