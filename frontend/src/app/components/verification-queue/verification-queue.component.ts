import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-verification-queue',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="verification-container p-4 font-inter">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h2 class="fw-bold m-0">Verification Queue</h2>
        <span class="badge bg-primary px-3 rounded-pill">{{ pendingUsers.length }} Pending</span>
      </div>

      <!-- Success Notification -->
      <div *ngIf="successMessage" class="alert alert-success alert-dismissible fade show d-flex align-items-center" role="alert">
        <i class="bi bi-shield-check fs-4 me-3"></i>
        <div>
          <strong>Success!</strong> {{ successMessage }}
        </div>
        <button type="button" class="btn-close" (click)="successMessage = ''" aria-label="Close"></button>
      </div>

      <div class="card border-0 shadow-sm glass-card">
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="bg-light">
                <tr>
                  <th class="ps-4">Full Name</th>
                  <th>Role</th>
                  <th>License/Details</th>
                  <th>Status</th>
                  <th class="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let user of pendingUsers">
                  <td class="ps-4">
                    <div class="fw-semibold text-dark name-text">{{ user.fullName }}</div>
                    <div class="small text-muted">{{ user.email }}</div>
                  </td>
                  <td>
                    <span class="role-badge">{{ user.role }}</span>
                  </td>
                  <td>
                    <div class="small text-dark">{{ user.role === 'DOCTOR' ? user.medicalLicenseNumber : user.shopDetails }}</div>
                    <div class="small text-muted" *ngIf="user.role === 'DOCTOR'">{{ user.specialization }}</div>
                  </td>
                  <td>
                    <span class="status-pill pending" *ngIf="!verifiedIds.has(user.id)">Pending</span>
                    <span class="status-pill verified" *ngIf="verifiedIds.has(user.id)"><i class="bi bi-check-circle-fill me-1"></i>Verified</span>
                  </td>
                  <td class="text-end pe-4">
                    <button class="btn btn-verify btn-sm" (click)="verifyUser(user.id)" *ngIf="!verifiedIds.has(user.id)">
                      Verify User
                    </button>
                    <button class="btn btn-success btn-sm" disabled *ngIf="verifiedIds.has(user.id)">
                      <i class="bi bi-check-lg"></i>
                    </button>
                  </td>
                </tr>
                <tr *ngIf="pendingUsers.length === 0">
                  <td colspan="5" class="text-center py-5 text-muted">
                    <i class="bi bi-check-circle display-4 d-block mb-3 text-success"></i>
                    No pending verifications at the moment.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .font-inter { font-family: 'Inter', sans-serif; }
    .glass-card {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(10px);
      border-radius: 20px;
    }
    .name-text { font-weight: 600; font-size: 1.05rem; }
    .role-badge {
      background: #f0f4f8;
      color: #1e3a8a; /* Apollo Blue */
      padding: 0.25rem 0.75rem;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .status-pill {
      display: inline-block;
      padding: 0.25rem 1rem;
      border-radius: 50px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .status-pill.pending {
      background: rgba(30, 58, 138, 0.1); /* Apollo Blue tint */
      color: #1e3a8a;
    }
    .status-pill.verified {
      background: rgba(16, 185, 129, 0.1); /* Success Green tint */
      color: #10b981;
    }
    .btn-verify {
      background: #10b981; /* Success Green */
      color: white;
      border: none;
      padding: 0.5rem 1.25rem;
      border-radius: 12px;
      font-weight: 600;
      transition: transform 0.2s;
    }
    .btn-verify:hover {
      background: #059669;
      transform: translateY(-2px);
    }
  `]
})
export class VerificationQueueComponent implements OnInit {
  pendingUsers: any[] = [];
  successMessage: string = '';
  verifiedIds: Set<number> = new Set();

  constructor(private adminService: AdminService) { }

  ngOnInit(): void {
    this.loadPendingUsers();
  }

  loadPendingUsers(): void {
    this.adminService.getAllUsers().subscribe(users => {
      this.pendingUsers = users.filter(u => !u.verified && u.role !== 'PATIENT' && u.role !== 'ADMIN');
      // Keep verified users visible temporarily if they are in the verifiedIds map
      // But since getAllUsers won't return them as !verified, they would disappear.
      // So we don't actually need to filter them OUT here if we want them to stay 
      // visible during the 3 second window, because loadPendingUsers is CALLED AFTER the 3 seconds.
    });
  }

  verifyUser(userId: number): void {
    if (confirm('Verify this professional?')) {
      this.adminService.verifyUser(userId).subscribe(() => {
        const verifiedUser = this.pendingUsers.find(u => u.id === userId);
        const name = verifiedUser ? verifiedUser.fullName : 'Professional';
        this.successMessage = `${name} has been successfully verified.`;

        // Mark as verified in the UI immediately
        this.verifiedIds.add(userId);

        // Auto-hide the message and reload the list after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
          this.verifiedIds.delete(userId);
          this.loadPendingUsers();
        }, 3000);
      });
    }
  }
}
