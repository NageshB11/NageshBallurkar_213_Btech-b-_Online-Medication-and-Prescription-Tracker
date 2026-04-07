import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="d-flex vh-100 bg-apollo font-inter">
      <!-- Admin Sidebar -->
      <nav class="sidebar d-flex flex-column p-4">
        <div class="sidebar-brand mb-4">
          <h4 class="fw-bold m-0 text-white">MedTrack Admin</h4>
        </div>
        
        <ul class="nav flex-column mb-auto">
          <li class="nav-item mb-2">
            <a routerLink="/admin/dashboard" class="nav-link text-white rounded-3 shadow-sm" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
              <i class="bi bi-grid-1x2-fill me-2"></i> Dashboard
            </a>
          </li>
          <li class="nav-item mb-2">
            <a routerLink="/admin/verification" class="nav-link text-white rounded-3 shadow-sm" routerLinkActive="active">
              <i class="bi bi-shield-check me-2"></i> Verification Queue
            </a>
          </li>
          <li class="nav-item mb-2">
            <a routerLink="/admin/audit-trace" class="nav-link text-white rounded-3 shadow-sm" routerLinkActive="active">
              <i class="bi bi-clock-history me-2"></i> Audit Trace
            </a>
          </li>
          <li class="nav-item mb-2">
            <a routerLink="/admin/patient-history" class="nav-link text-white rounded-3 shadow-sm" routerLinkActive="active">
              <i class="bi bi-person-lines-fill me-2"></i> Patient History
            </a>
          </li>
        </ul>
        
        <div class="sidebar-footer pt-3 mt-3 border-top border-secondary">
          <div class="d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center">
              <div class="avatar bg-primary text-white rounded-circle me-2">A</div>
              <div class="admin-info">
                <div class="fw-bold text-white small">System Admin</div>
                <div class="text-white-50 x-small">admin&#64;medtrack.com</div>
              </div>
            </div>
            <button class="btn btn-link text-white-50 p-0" (click)="logout()">
              <i class="bi bi-box-arrow-right"></i>
            </button>
          </div>
        </div>
      </nav>

      <!-- Main Content -->
      <div class="flex-grow-1 overflow-auto">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .font-inter { font-family: 'Inter', sans-serif; }
    .bg-apollo { background: linear-gradient(135deg, #f8f9fa 0%, #e2e8f0 100%); }
    .x-small { font-size: 0.7rem; }
    
    .sidebar {
      width: 280px;
      background: linear-gradient(180deg, #1e1b4b 0%, #312e81 100%);
      min-height: 100vh;
      flex-shrink: 0;
      position: sticky;
      top: 0;
      z-index: 1100;
    }
    
    .nav-link {
      color: rgba(255,255,255,0.7) !important;
      padding: 0.8rem 1.2rem;
      transition: all 0.3s;
      border: 1px solid transparent;
    }
    
    .nav-link:hover, .nav-link.active {
      color: white !important;
      background: rgba(255,255,255,0.1) !important;
      border: 1px solid rgba(255,255,255,0.1);
    }

    .avatar {
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      font-weight: bold; font-size: 0.8rem;
    }
  `]
})
export class AdminLayoutComponent {
  constructor(private authService: AuthService) {}
  logout() { this.authService.logout(); }
}
