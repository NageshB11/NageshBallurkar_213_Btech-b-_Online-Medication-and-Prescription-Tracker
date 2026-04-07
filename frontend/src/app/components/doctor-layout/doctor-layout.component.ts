import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-doctor-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-container min-vh-100 bg-doctor-soft">
      <!-- Glassmorphic Header -->
      <nav class="navbar glass-header py-3 mb-4 sticky-top">
        <div class="container-fluid px-4 px-lg-5">
          <a class="navbar-brand d-flex align-items-center" routerLink="/doctor/dashboard">
            <i class="bi bi-heart-pulse text-white me-2 fs-4"></i>
            <span class="fs-4 brand-title text-white">MedTrack<span class="fw-light text-white-50">Plus</span></span>
          </a>

          <div class="d-flex align-items-center gap-3">
            <a class="nav-link-apollo" routerLink="/doctor/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Dashboard</a>
            <a class="nav-link-apollo" routerLink="/doctor/patients" routerLinkActive="active">My Patients</a>
            <a class="nav-link-apollo" routerLink="/doctor/appointments" routerLinkActive="active">Appointments</a>
            <a class="nav-link-apollo" routerLink="/doctor/analytics" routerLinkActive="active">Analytics</a>
            
            <div class="vr mx-2 text-secondary opacity-25" style="height: 24px;"></div>
            
            <button class="btn btn-light rounded-circle shadow-sm border" (click)="logout()" title="Logout">
              <i class="bi bi-box-arrow-right text-danger"></i>
            </button>
          </div>
        </div>
      </nav>

      <!-- Main Content Outlet -->
      <main class="content-area">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .bg-doctor-soft { background: #f8fafc; }
    .glass-header {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(0,0,0,0.05);
      z-index: 1000;
    }
    .brand-title {
      letter-spacing: -0.5px;
      font-weight: 700;
      color: #ffffff;
    }
    .nav-link-apollo {
      text-decoration: none;
      color: rgba(255, 255, 255, 0.85);
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      transition: all 0.2s;
    }
    .nav-link-apollo:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.1);
    }
    .nav-link-apollo.active {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.2);
    }
  `]
})
export class DoctorLayoutComponent {
  constructor(private authService: AuthService) {}
  logout() { this.authService.logout(); }
}
