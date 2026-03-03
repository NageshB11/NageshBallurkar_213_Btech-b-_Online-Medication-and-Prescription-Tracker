import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-pending-verification',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="vh-100 d-flex align-items-center justify-content-center bg-apollo font-inter">
      <div class="glass-card p-5 text-center shadow-lg" style="max-width: 500px;">
        <div class="mb-4">
          <div class="verify-icon-container mb-3">
            <i class="bi bi-shield-lock text-primary display-1"></i>
          </div>
          <h2 class="fw-bold text-dark">Account Pending Verification</h2>
        </div>
        
        <p class="text-muted mb-4">
          Welcome, <span class="fw-semibold text-dark">{{ fullName }}</span>. Your professional credentials ({{ role }}) are currently being reviewed by our administrative team.
        </p>
        
        <div class="alert alert-info border-0 rounded-4 py-3 mb-4">
          <i class="bi bi-info-circle-fill me-2"></i>
          Verification usually takes 24-48 business hours.
        </div>
        
        <div class="d-grid gap-2">
          <button (click)="logout()" class="btn btn-outline-secondary rounded-pill py-2">
            Log Out & Return Later
          </button>
        </div>
        
        <div class="mt-4 small text-secondary">
          Need urgent assistance? <a href="mailto:support&#64;medtrack.com" class="text-primary text-decoration-none fw-semibold">Contact Support</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .font-inter { font-family: 'Inter', sans-serif; }
    .bg-apollo { background: #f0f4f8; }
    .glass-card {
      background: white;
      border-radius: 24px;
      border: 1px solid rgba(0,0,0,0.05);
    }
    .verify-icon-container {
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.8; }
      100% { transform: scale(1); opacity: 1; }
    }
  `]
})
export class PendingVerificationComponent {
  fullName: string | null;
  role: string | null;

  constructor(private authService: AuthService) {
    this.fullName = this.authService.getFullName();
    this.role = this.authService.getRole();
  }

  logout() {
    this.authService.logout();
  }
}
