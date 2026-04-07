import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin.service';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

type ViewMode = 'LAUNCHPAD' | 'ANALYTICS' | 'USERS' | 'ALERTS' | 'COMPLIANCE';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="flex-grow-1 overflow-auto p-4 p-lg-5 bg-apollo min-vh-100">
        <div class="container-fluid max-width-1400">
          
          <!-- STRATEGIC HEADER -->
          <header class="mb-5 d-flex justify-content-between align-items-center" style="position: relative; z-index: 1101;">
            <div>
              <div class="d-flex align-items-center gap-2 mb-1">
                <span class="badge bg-primary-subtle text-primary rounded-pill px-3 py-2 x-small fw-bold">ADMIN CORE v2.0</span>
                <!-- Diagnostic Recovery Button -->
                <button class="btn btn-danger btn-sm rounded-pill fw-bold shadow-sm ms-3" style="font-size: 0.6rem; letter-spacing: 0.05em;" (click)="killOverlays()">
                   UI EMERGENCY RESET
                </button>
                <span class="text-success small d-flex align-items-center gap-1">
                  <span class="pulse-dot"></span> System Online
                </span>
              </div>
              <h2 class="fw-bold text-dark m-0 display-6" style="letter-spacing: -1px;">
                {{ viewMode === 'LAUNCHPAD' ? 'Mission Control' : getModeTitle() }}
              </h2>
              <p class="text-muted mb-0">{{ getModeSubtitle() }}</p>
            </div>
            <div class="d-flex gap-3 align-items-center">
              <div class="dropdown me-1">
                <button class="btn btn-outline-dark dropdown-toggle rounded-pill px-3 shadow-sm h-100" type="button" data-bs-toggle="dropdown">
                  <i class="bi bi-people-fill me-2"></i>Quick View
                </button>
                <div class="dropdown-menu dropdown-menu-dark shadow-lg border-0 bg-dark bg-opacity-90 blur-10 p-3" style="width: 600px; max-height: 500px; overflow-y: auto;">
                  <div class="row">
                    <div class="col-md-4 border-end border-white border-opacity-10">
                      <h6 class="dropdown-header text-info small text-uppercase fw-bold px-0 mb-2">Doctors</h6>
                      <div class="list-group list-group-flush bg-transparent">
                        <button *ngFor="let doc of doctors" (click)="openUser360(doc)" class="list-group-item list-group-item-action bg-transparent text-white border-0 py-1 px-0 small">
                          {{ doc.fullName }}
                        </button>
                        <div *ngIf="doctors.length === 0" class="text-muted small py-1">No doctors</div>
                      </div>
                    </div>
                    <div class="col-md-4 border-end border-white border-opacity-10">
                      <h6 class="dropdown-header text-primary small text-uppercase fw-bold px-0 mb-2">Patients</h6>
                      <div class="list-group list-group-flush bg-transparent">
                        <button *ngFor="let pat of patients" (click)="openUser360(pat)" class="list-group-item list-group-item-action bg-transparent text-white border-0 py-1 px-0 small">
                          {{ pat.fullName }}
                        </button>
                        <div *ngIf="patients.length === 0" class="text-muted small py-1">No patients</div>
                      </div>
                    </div>
                    <div class="col-md-4">
                      <h6 class="dropdown-header text-warning small text-uppercase fw-bold px-0 mb-2">Pharmacists</h6>
                      <div class="list-group list-group-flush bg-transparent">
                        <button *ngFor="let phar of pharmacists" (click)="openUser360(phar)" class="list-group-item list-group-item-action bg-transparent text-white border-0 py-1 px-0 small">
                          {{ phar.fullName }}
                        </button>
                        <div *ngIf="pharmacists.length === 0" class="text-muted small py-1">No pharmacists</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="input-group input-group-sm search-container shadow-sm" style="width: 250px;">
                <span class="input-group-text bg-white border-0 ps-3"><i class="bi bi-search text-muted"></i></span>
                <input type="text" class="form-control border-0 py-2" placeholder="User ID/Email..." 
                  [(ngModel)]="userSearchQuery">
              </div>
              <button *ngIf="viewMode !== 'LAUNCHPAD'" class="btn btn-dark rounded-pill px-4 shadow-sm h-100" (click)="setMode('LAUNCHPAD')">
                <i class="bi bi-grid-fill me-2"></i> Launchpad
              </button>
              <button class="btn btn-white rounded-circle shadow-sm p-2" (click)="loadInitialData()" title="Sync System Data">
                <i class="bi bi-arrow-clockwise fs-5"></i>
              </button>
            </div>
          </header>

          <!-- SECTION 1: MISSION CONTROL (LAUNCHPAD) -->
          <div class="row g-4 mb-5 animate-in" *ngIf="viewMode === 'LAUNCHPAD'">
            <!-- Card 1: Intelligence Hub -->
            <div class="col-md-4">
              <div class="launch-card analytics-hub" (click)="setMode('ANALYTICS')">
                <div class="card-glow"></div>
                <div class="launch-icon bg-blue">
                  <i class="bi bi-bar-chart-fill"></i>
                </div>
                <div class="launch-content">
                  <h5 class="fw-bold text-dark mb-1">Intelligence Hub</h5>
                  <p class="text-muted small mb-3">System statistics, user distribution, and clinic performance.</p>
                  <div class="d-flex align-items-center gap-2 mt-auto">
                    <span class="badge bg-light border text-dark">{{ stats?.totalPatients || 0 }} Patients</span>
                    <span class="text-primary x-small fw-bold">PROCEED <i class="bi bi-arrow-right"></i></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card 2: User 360 Audit -->
            <div class="col-md-4">
              <div class="launch-card audit-hub" [routerLink]="['/admin/audit-trace']">
                <div class="card-glow"></div>
                <div class="launch-icon bg-indigo">
                  <i class="bi bi-person-bounding-box"></i>
                </div>
                <div class="launch-content">
                  <h5 class="fw-bold text-dark mb-1">User 360 Audit</h5>
                  <p class="text-muted small mb-3">Comprehensive identity trace and security history for all users.</p>
                  <div class="d-flex align-items-center gap-2 mt-auto">
                    <span class="badge bg-light border text-dark">Full Trace</span>
                    <span class="text-indigo x-small fw-bold">INSPECT <i class="bi bi-arrow-right"></i></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card 3: Verification Queue -->
            <div class="col-md-4">
              <div class="launch-card verify-hub" [routerLink]="['/admin/verification']">
                <div class="card-glow"></div>
                <div class="launch-icon bg-emerald">
                  <i class="bi bi-shield-lock-fill"></i>
                </div>
                <div class="launch-content">
                  <h5 class="fw-bold text-dark mb-1">Verification Center</h5>
                  <p class="text-muted small mb-3">Approve or reject pending professional registrations.</p>
                  <div class="d-flex align-items-center gap-2 mt-auto">
                    <span class="badge bg-emerald-subtle text-emerald rounded-pill" *ngIf="stats?.pendingVerificationsCount > 0">{{ stats.pendingVerificationsCount }} Awaiting Review</span>
                    <span class="badge bg-light border text-muted rounded-pill" *ngIf="!stats || stats.pendingVerificationsCount === 0">Queue Empty</span>
                    <span class="text-emerald x-small fw-bold">OPEN <i class="bi bi-arrow-right"></i></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card 4: System Sentinel -->
            <div class="col-md-4">
              <div class="launch-card alert-hub" (click)="setMode('ALERTS')">
                <div class="card-glow"></div>
                <div class="launch-icon bg-rose">
                  <i class="bi bi-activity"></i>
                </div>
                <div class="launch-content">
                  <h5 class="fw-bold text-dark mb-1">System Sentinel</h5>
                  <p class="text-muted small mb-3">Live security alerts, errors, and system audit logs.</p>
                  <div class="d-flex align-items-center gap-2 mt-auto">
                    <span class="badge bg-rose-subtle text-rose rounded-pill">{{ getCriticalAlertCount() }} Critical</span>
                    <span class="text-rose x-small fw-bold">VIEW FEED <i class="bi bi-arrow-right"></i></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card 5: Platform Census -->
            <div class="col-md-4">
              <div class="launch-card users-hub" (click)="setMode('USERS')">
                <div class="card-glow"></div>
                <div class="launch-icon bg-violet">
                  <i class="bi bi-people-fill"></i>
                </div>
                <div class="launch-content">
                  <h5 class="fw-bold text-dark mb-1">Platform Census</h5>
                  <p class="text-muted small mb-3">Global user management, status controls, and security resets.</p>
                  <div class="d-flex align-items-center gap-2 mt-auto">
                    <span class="badge bg-light border text-dark">Admin Control</span>
                    <span class="text-violet x-small fw-bold">MANAGE <i class="bi bi-arrow-right"></i></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Card 6: Compliance & Export -->
            <div class="col-md-4">
              <div class="launch-card export-hub" (click)="setMode('COMPLIANCE')">
                <div class="card-glow"></div>
                <div class="launch-icon bg-amber">
                  <i class="bi bi-file-earmark-pdf-fill"></i>
                </div>
                <div class="launch-content">
                  <h5 class="fw-bold text-dark mb-1">Compliance Export</h5>
                  <p class="text-muted small mb-3">Generate official PDF audit reports and pharmacy disbursements.</p>
                  <div class="d-flex align-items-center gap-2 mt-auto">
                    <span class="badge bg-light border text-dark">PDF Export</span>
                    <span class="text-amber x-small fw-bold">GENERATE <i class="bi bi-arrow-right"></i></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SECTION 2: ANALYTICS HUB VIEW -->
          <div class="animate-in" *ngIf="viewMode === 'ANALYTICS'">
            
            <!-- Conditional Content Wrapper -->
            <ng-container *ngIf="stats; else noStats">
              <div class="row g-4 mb-4">
                <div class="col-md-3">
                  <div class="glass-card kpi-plate p-4 border-start-thick bg-blue">
                     <small class="text-uppercase fw-bold text-muted x-small ls-1">Total Users</small>
                     <div class="h3 fw-bold m-0 mt-1">{{ stats.totalPatients + stats.totalDoctors + stats.totalPharmacists }}</div>
                     <div class="sparkline-wrap mt-3" style="height: 40px;"><canvas #sparklineUsers></canvas></div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="glass-card kpi-plate p-4 border-start-thick bg-emerald">
                     <small class="text-uppercase fw-bold text-muted x-small ls-1">Prescriptions</small>
                     <div class="h3 fw-bold m-0 mt-1">{{ stats.totalPrescriptions }}</div>
                     <div class="sparkline-wrap mt-3" style="height: 40px;"><canvas #sparklinePrescriptions></canvas></div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="glass-card kpi-plate p-4 border-start-thick bg-amber">
                     <small class="text-uppercase fw-bold text-muted x-small ls-1">Efficiency Rate</small>
                     <div class="h3 fw-bold m-0 mt-1">{{ stats.dispensingRate | number:'1.1-1' }}%</div>
                     <div class="sparkline-wrap mt-3" style="height: 40px;"><canvas #sparklineVelocity></canvas></div>
                  </div>
                </div>
                <div class="col-md-3">
                  <div class="glass-card kpi-plate p-4 border-start-thick bg-rose">
                     <small class="text-uppercase fw-bold text-muted x-small ls-1">Risk Alerts</small>
                     <div class="h3 fw-bold m-0 mt-1">{{ getCriticalAlertCount() }}</div>
                     <div class="sparkline-wrap mt-3" style="height: 40px;"><canvas #sparklineAlerts></canvas></div>
                  </div>
                </div>
              </div>

              <div class="row g-4">
                <div class="col-lg-5">
                  <div class="glass-card p-4">
                    <h6 class="fw-bold mb-4 text-dark align-center-text">User Distribution</h6>
                    <div class="chart-container" style="height: 300px;"><canvas #userDistChart></canvas></div>
                  </div>
                </div>
                <div class="col-lg-7">
                  <div class="glass-card p-4">
                    <h6 class="fw-bold mb-4 text-dark">Pharmacist Fulfillment (Avg Hours)</h6>
                    <div class="chart-container" style="height: 300px;"><canvas #fulfillmentChart></canvas></div>
                  </div>
                </div>
              </div>
            </ng-container>

            <!-- Loading / No Data Template -->
            <ng-template #noStats>
              <div class="glass-card p-5 text-center mb-4">
                <div class="mb-4 text-muted"><i class="bi bi-bar-chart fs-1 opacity-25"></i></div>
                <h4 class="fw-bold">No Analytics Data Available</h4>
                <p class="text-muted small">The system hasn't aggregated performance metrics yet. Try syncing data.</p>
                <button class="btn btn-primary rounded-pill px-4 mt-3" (click)="loadInitialData()">Sync Now</button>
              </div>
            </ng-template>

          </div>

          <!-- SECTION 3: PLATFORM CENSUS VIEW -->
          <div class="animate-in" *ngIf="viewMode === 'USERS'">
            <div class="glass-card overflow-hidden">
               <div class="p-4 border-bottom bg-light bg-opacity-50">
                  <div class="row align-items-center">
                    <div class="col">
                      <h5 class="fw-bold m-0">Global User Registry</h5>
                      <small class="text-muted">Direct management and status oversight</small>
                    </div>
                    <div class="col-auto d-flex gap-2">
                      <select class="form-select border-0 shadow-sm rounded-pill px-3" style="width: 150px; font-size: 0.85rem;" [(ngModel)]="roleFilter">
                        <option value="ALL">All Roles</option>
                        <option value="PATIENT">Patients</option>
                        <option value="DOCTOR">Doctors</option>
                        <option value="PHARMACIST">Pharmacists</option>
                      </select>
                      <div class="input-group search-container">
                        <span class="input-group-text bg-white border-0"><i class="bi bi-funnel"></i></span>
                        <input type="text" class="form-control border-0" placeholder="Filter by name or email..." [(ngModel)]="userSearchQuery">
                      </div>
                    </div>
                  </div>
               </div>
               <div class="table-responsive" style="max-height: 60vh;">
                 <table class="table table-hover align-middle mb-0 custom-table">
                    <thead class="sticky-top bg-white shadow-sm">
                      <tr>
                        <th class="ps-4 sortable-header" (click)="toggleSort('fullName')">
                          Identity <i class="bi ms-1" [ngClass]="getSortIcon('fullName')"></i>
                        </th>
                        <th class="sortable-header" (click)="toggleSort('role')">
                          Role <i class="bi ms-1" [ngClass]="getSortIcon('role')"></i>
                        </th>
                        <th class="sortable-header" (click)="toggleSort('active')">
                          Access Status <i class="bi ms-1" [ngClass]="getSortIcon('active')"></i>
                        </th>
                        <th class="sortable-header" (click)="toggleSort('verified')">
                          Verification <i class="bi ms-1" [ngClass]="getSortIcon('verified')"></i>
                        </th>
                        <th class="sortable-header" (click)="toggleSort('adherence')">
                          Engagement <i class="bi ms-1" [ngClass]="getSortIcon('adherence')"></i>
                        </th>
                        <th class="text-end pe-4">Controls</th>
                      </tr>
                    </thead>
                   <tbody>
                     <tr *ngFor="let u of filteredUsersList" class="cursor-pointer" (click)="openUser360(u)">
                       <td class="ps-4">
                         <div class="d-flex align-items-center gap-3">
                           <div class="avatar-sm bg-primary-subtle text-primary fw-bold">{{ u.fullName.charAt(0) }}</div>
                           <div>
                             <div class="fw-bold text-dark">{{ u.fullName }}</div>
                             <div class="small text-muted">{{ u.email }}</div>
                           </div>
                         </div>
                       </td>
                       <td><span class="badge border bg-white text-dark">{{ u.role }}</span></td>
                       <td>
                          <span class="badge rounded-pill" [ngClass]="u.active ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'">
                            <i class="bi me-1" [ngClass]="u.active ? 'bi-lock-open-fill' : 'bi-lock-fill'"></i>
                             {{ u.active ? 'Active' : 'Locked' }}
                           </span>
                        </td>
                        <td>
                           <span class="badge rounded-pill" [ngClass]="u.verified ? 'bg-info-subtle text-info' : 'bg-warning-subtle text-warning'">
                             <i class="bi me-1" [ngClass]="u.verified ? 'bi-patch-check-fill' : 'bi-patch-exclamation-fill'"></i>
                             {{ u.verified ? 'Verified' : 'Pending' }}
                           </span>
                        </td>
                       <td>
                          <div class="small" *ngIf="u.role === 'PATIENT'">
                            <div class="d-flex justify-content-between mb-1">
                              <span class="text-muted x-small">Adherence</span>
                              <span class="fw-bold x-small" [ngClass]="(u.adherenceScore || 0) < 50 ? 'text-danger' : 'text-success'">{{ u.adherenceScore || 0 | number:'1.0-0' }}%</span>
                            </div>
                            <div class="progress" style="height: 4px; width: 80px;">
                              <div class="progress-bar" [ngClass]="(u.adherenceScore || 0) < 50 ? 'bg-danger' : 'bg-success'" 
                                [style.width.%]="u.adherenceScore || 0"></div>
                            </div>
                          </div>
                       </td>
                       <td class="text-end pe-4">
                         <button class="btn btn-sm btn-outline-dark rounded-pill px-3" (click)="openUser360(u); $event.stopPropagation()">Inspect 360</button>
                       </td>
                     </tr>
                     <tr *ngIf="filteredUsersList.length === 0">
                        <td colspan="6" class="text-center py-5 text-muted">
                          <i class="bi bi-person-x fs-2 d-block mb-2"></i>
                          No users found matching your criteria.
                        </td>
                      </tr>
                   </tbody>
                 </table>
               </div>
            </div>
          </div>

          <!-- SECTION 4: SYSTEM SENTINEL (ALERTS) VIEW -->
          <div class="animate-in" *ngIf="viewMode === 'ALERTS'">
            <div class="glass-card overflow-hidden">
               <div class="p-4 border-bottom bg-light bg-opacity-50">
                  <h5 class="fw-bold m-0 text-rose"><i class="bi bi-activity me-2"></i>Security & Network Sentinel</h5>
                  <small class="text-muted">Chronological system audit logs and critical triggers</small>
               </div>
               <div class="table-responsive" style="max-height: 60vh;">
                 <table class="table table-hover align-middle mb-0 custom-table">
                   <thead>
                     <tr>
                       <th class="ps-4">Severity</th>
                       <th>Event Triage</th>
                       <th>Source</th>
                       <th>Timeline</th>
                     </tr>
                   </thead>
                   <tbody>
                     <tr *ngFor="let alert of stats?.recentAlerts" class="alert-row">
                       <td class="ps-4">
                         <span class="badge rounded-pill px-3 py-2 fw-bold" [ngClass]="{
                           'bg-danger text-white': alert.severity === 'ERROR',
                           'bg-warning-subtle text-warning border-warning border': alert.severity === 'WARNING',
                           'bg-info-subtle text-info border-info border': alert.severity === 'INFO'
                         }">{{ alert.severity }}</span>
                       </td>
                       <td><div class="text-dark fw-medium small">{{ alert.message }}</div></td>
                       <td><span class="badge bg-light text-dark font-mono x-small">ROOT_SYS</span></td>
                       <td><span class="text-muted small"><i class="bi bi-clock me-1"></i>{{ alert.timestamp | date:'shortTime' }}</span></td>
                     </tr>
                     <tr *ngIf="!stats?.recentAlerts || stats?.recentAlerts.length === 0">
                        <td colspan="4" class="text-center py-5 text-muted">
                          <i class="bi bi-shield-check fs-2 d-block mb-2 text-success opacity-50"></i>
                          No security alerts or system logs detected.
                        </td>
                      </tr>
                   </tbody>
                 </table>
               </div>
            </div>
          </div>

          <!-- SECTION 5: COMPLIANCE EXPORT VIEW -->
          <div class="animate-in" *ngIf="viewMode === 'COMPLIANCE'">
             <div class="glass-card p-5 text-center bg-white border-dashed">
                <i class="bi bi-file-earmark-pdf-fill display-1 text-danger mb-4"></i>
                <h3 class="fw-bold mb-3">Official Compliance Center</h3>
                <p class="text-muted mb-5 mx-auto" style="max-width: 500px;">
                  Configure and generate cryptographically signed audit reports for regulatory compliance and pharmacy disbursement reviews.
                </p>

                <div class="row g-3 justify-content-center">
                   <div class="col-md-3">
                     <label class="form-label text-muted small fw-bold text-uppercase">Report Schema</label>
                     <select class="form-select border-0 bg-light" [(ngModel)]="exportType">
                        <option value="AUDIT">Security Audit</option>
                        <option value="DISBURSEMENT">Pharmacy Payout</option>
                     </select>
                   </div>
                   <div class="col-md-3">
                     <label class="form-label text-muted small fw-bold text-uppercase">Start Range</label>
                     <input type="date" class="form-control border-0 bg-light" [(ngModel)]="exportStartDate">
                   </div>
                   <div class="col-md-3">
                     <label class="form-label text-muted small fw-bold text-uppercase">End Range</label>
                     <input type="date" class="form-control border-0 bg-light" [(ngModel)]="exportEndDate">
                   </div>
                   <div class="col-md-3 d-flex align-items-end">
                      <button class="btn btn-danger w-100 py-2 d-flex justify-content-center align-items-center gap-2 rounded-pill shadow" 
                              [disabled]="exporting" (click)="generateAuditReport()">
                        <span *ngIf="exporting" class="spinner-border spinner-border-sm"></span>
                        <i *ngIf="!exporting" class="bi bi-download"></i>
                        Generate Signed PDF
                      </button>
                   </div>
                </div>
             </div>
          </div>

        </div>
      </div>

      <!-- Slide-Over User 360 Drawer - UNIFIED & RENAMED -->
      <div class="m-360-drawer glass-card d-flex flex-column" [class.open]="isDrawerOpen">
        <div class="m-360-header p-4 border-bottom d-flex justify-content-between align-items-center">
            <h5 class="fw-bold m-0"><i class="bi bi-person-bounding-box text-primary me-2"></i>User 360 Profile</h5>
            <button class="btn btn-sm btn-light rounded-circle shadow-sm" (click)="closeUser360()"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="drawer-body p-4 flex-grow-1 overflow-auto" *ngIf="isDrawerOpen && selectedUser">
             <div class="text-center mb-4" *ngIf="selectedUser?.fullName">
                <div class="avatar-lg bg-primary text-white mx-auto mb-3 shadow-sm">{{ selectedUser?.fullName?.charAt(0)?.toUpperCase() }}</div>
                <h4 class="fw-bold mb-1">{{ selectedUser?.fullName }}</h4>
                <div class="text-muted small">{{ selectedUser?.email }}</div>
                <div class="mt-2 text-uppercase fw-bold text-primary x-small tracking-wide">{{ selectedUser?.role }}</div>
            </div>

            <!-- Profile Details Sections -->
            <div class="card border-0 bg-light rounded-4 mb-3">
                <div class="card-body p-3">
                    <h6 class="fw-bold text-secondary mb-3 x-small text-uppercase ls-1">Security & Tracking</h6>
                    <div class="d-flex justify-content-between mb-2 small">
                        <span class="text-muted">Last Login</span>
                        <span class="fw-medium text-dark">{{ selectedUser?.lastLogin ? (selectedUser?.lastLogin | date:'medium') : 'Never' }}</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2 small">
                        <span class="text-muted">Verification</span>
                        <span class="fw-bold text-success" *ngIf="selectedUser?.verified">Verified</span>
                        <span class="fw-bold text-warning" *ngIf="!selectedUser?.verified">Pending</span>
                    </div>
                </div>
            </div>

            <!-- Role Specific Data -->
            <div class="card border-0 bg-light rounded-4 mb-3" *ngIf="selectedUser?.role === 'DOCTOR' || selectedUser?.role === 'PATIENT' || selectedUser?.role === 'PHARMACIST'">
                <div class="card-body p-3">
                    <h6 class="fw-bold text-secondary mb-2 x-small text-uppercase ls-1">Role Detail Audit</h6>
                    
                    <div *ngIf="selectedUser?.role === 'DOCTOR'">
                        <div class="mb-2">
                            <span class="text-muted x-small">License:</span>
                            <span class="ms-2 fw-bold text-dark small">{{ selectedUser?.medicalLicenseNumber || 'N/A' }}</span>
                        </div>
                    </div>

                    <div *ngIf="selectedUser?.role === 'PATIENT'">
                        <div class="d-flex justify-content-between x-small">
                            <span>Medication Adherence:</span>
                            <span class="fw-bold" [ngClass]="(selectedUser?.adherenceScore || 0) < 50 ? 'text-danger' : 'text-success'">
                                {{ selectedUser?.adherenceScore || 0 | number:'1.0-0' }}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Clinical Feed for Doctors -->
            <div class="card border-0 bg-light rounded-4 mb-3 shadow-sm overflow-hidden" *ngIf="selectedUser?.role === 'DOCTOR'">
                <div class="card-header bg-white border-0 py-2">
                    <h6 class="fw-bold text-dark m-0 x-small text-uppercase">Recent Prescriptions</h6>
                </div>
                <div class="card-body p-0">
                    <div *ngIf="doctorPrescriptions.length === 0" class="text-center py-3 text-muted x-small bg-white">No activity found.</div>
                    <div class="list-group list-group-flush" *ngIf="doctorPrescriptions.length > 0">
                        <div *ngFor="let rx of doctorPrescriptions" class="list-group-item bg-white py-2 px-3 border-start-thick" [ngClass]="rx.status === 'ISSUED' ? 'bg-emerald' : 'bg-blue'">
                            <div class="d-flex justify-content-between align-items-center">
                                <div class="x-small">
                                    <div class="fw-bold text-dark">Rx #{{ rx.id }}</div>
                                    <div class="text-muted xx-small">{{ rx.createdAt | date:'MMM d' }}</div>
                                </div>
                                <span class="badge rounded-pill xx-small bg-primary-subtle text-primary">{{ rx.status }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card border-0 bg-white shadow-sm rounded-4 mb-3">
                <div class="card-body p-3">
                    <h6 class="fw-bold text-secondary mb-2 x-small text-uppercase">Contact Update</h6>
                    <div class="mb-2">
                        <input type="text" class="form-control form-control-sm border-0 bg-light x-small" [(ngModel)]="selectedUser.phone" placeholder="Phone">
                    </div>
                    <button class="btn btn-sm btn-primary w-100 rounded-pill x-small" (click)="saveUserProfile()">Update Meta</button>
                </div>
            </div>
            
            <div class="card border-0 p-3 mb-3 d-flex justify-content-between align-items-center" [ngClass]="selectedUser?.active ? 'bg-danger-subtle' : 'bg-success-subtle'" style="border-radius: 12px;">
                <div class="x-small">
                    <div class="fw-bold" [ngClass]="selectedUser?.active ? 'text-danger' : 'text-success'">Account Status</div>
                    <div class="text-muted">{{ selectedUser?.active ? 'Access Active' : 'Access Restricted' }}</div>
                </div>
                <button class="btn btn-xs btn-outline-dark fw-bold border-0" (click)="toggleUserStatus(selectedUser?.id)">
                    {{ selectedUser?.active ? 'Lock' : 'Unlock' }}
                </button>
            </div>

            <!-- Inline Verification Action for Professionals -->
            <div class="card border-0 p-3 bg-primary-subtle rounded-4 mb-3 d-flex justify-content-between align-items-center" *ngIf="!selectedUser?.verified && (selectedUser?.role === 'DOCTOR' || selectedUser?.role === 'PHARMACIST')">
                <div class="x-small">
                    <div class="fw-bold text-primary">Awaiting Approval</div>
                    <div class="text-muted">Review credentials and verify access.</div>
                </div>
                <button class="btn btn-sm btn-primary rounded-pill px-3 fw-bold" (click)="verifyUserFrom360(selectedUser.id)">
                    Verify Now
                </button>
            </div>
        </div>
      </div>
  `,
  styles: [`
    .font-inter { font-family: 'Inter', sans-serif; }
    .bg-apollo { background: #f8fafc; }
    .ls-1 { letter-spacing: 0.05em; }
    .max-width-1400 { max-width: 1400px; margin: 0 auto; }
    
    .search-container {
      background: white; border-radius: 100px; overflow: hidden;
      border: 1px solid rgba(0,0,0,0.05);
    }
    
    .pulse-dot {
      width: 8px; height: 8px; background: #10b981;
      border-radius: 50%; display: inline-block;
      box-shadow: 0 0 0 rgba(16, 185, 129, 0.4);
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    /* LAUNCH CARDS */
    .launch-card {
      background: white; border-radius: 24px; padding: 32px;
      height: 100%; display: flex; flex-direction: column;
      position: relative; overflow: hidden; cursor: pointer;
      transition: all 0.4s cubic-bezier(0.2, 1, 0.2, 1);
      border: 1px solid rgba(0,0,0,0.03);
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    
    .launch-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px -10px rgba(0,0,0,0.08);
      border-color: rgba(0,0,0,0.08);
    }
    
    .card-glow {
      position: absolute; top: 0; right: 0;
      width: 100px; height: 100px;
      background: radial-gradient(circle at center, rgba(0,0,0,0.03) 0%, transparent 70%);
      pointer-events: none;
    }
    
    .launch-icon {
      width: 56px; height: 56px; border-radius: 16px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.5rem; margin-bottom: 24px; color: white;
    }
    
    .bg-blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
    .bg-indigo { background: linear-gradient(135deg, #6366f1, #4f46e5); }
    .bg-emerald { background: linear-gradient(135deg, #10b981, #059669); }
    .bg-rose { background: linear-gradient(135deg, #f43f5e, #e11d48); }
    .bg-violet { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }
    .bg-amber { background: linear-gradient(135deg, #f59e0b, #d97706); }
    
    .animate-in {
      animation: fadeInUp 0.5s ease-out;
    }
    
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* GLASS CARDS */
    .glass-card {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,1);
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.04);
    }
    
    .border-start-thick { border-left-width: 5px !important; }
    .border-start-thick.bg-blue { border-left-color: #3b82f6 !important; }
    .border-start-thick.bg-emerald { border-left-color: #10b981 !important; }
    .border-start-thick.bg-amber { border-left-color: #f59e0b !important; }
    .border-start-thick.bg-rose { border-left-color: #f43f5e !important; }

    .custom-table thead th {
      background: #f8fafc; color: #64748b;
      font-size: 0.75rem; text-transform: uppercase;
      font-weight: 700; padding: 1.25rem 1rem; border: none;
    }
    .custom-table tbody td { padding: 1.25rem 1rem; border-bottom: 1px solid #f1f5f9; }
    
    .avatar-sm { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
    .ls-1 { letter-spacing: 0.05em; }
    .ls-1 { letter-spacing: 0.05em; }
    .avatar-lg { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; }

    .m-360-drawer {
      position: fixed; top: 0; right: -420px; bottom: 0;
      width: 420px; background: white; z-index: 1200;
      transition: right 0.4s cubic-bezier(0.2, 1, 0.2, 1);
      box-shadow: -20px 0 60px rgba(0,0,0,0.1);
      border-left: 1px solid rgba(0,0,0,0.05);
    }
    .m-360-drawer.open { right: 0; }
    
    /* SUPPRESSION OF ALL OVERLAYS UNLESS ACTIVE */
    :host ::ng-deep .modal-backdrop, 
    :host ::ng-deep .drawer-overlay,
    :host ::ng-deep .m-360-overlay { 
      display: none !important; 
    }
    
    .font-mono { font-family: 'SFMono-Regular', Consolas, monospace; }
    .x-small { font-size: 0.7rem; }
    .sortable-header { cursor: pointer; transition: background 0.2s; }
    .sortable-header:hover { background: #f1f5f9 !important; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  @ViewChild('fulfillmentChart') fulfillmentCanvas!: ElementRef;
  @ViewChild('userDistChart') userDistCanvas!: ElementRef;
  
  @ViewChild('sparklineUsers') sparklineUsersCanvas!: ElementRef;
  @ViewChild('sparklinePrescriptions') sparklineRxCanvas!: ElementRef;
  @ViewChild('sparklineVelocity') sparklineVelocityCanvas!: ElementRef;
  @ViewChild('sparklineAlerts') sparklineAlertsCanvas!: ElementRef;

  viewMode: ViewMode = 'LAUNCHPAD';
  stats: any = null;
  systemAudits: any[] = [];
  users: any[] = [];
  userSearchQuery: string = '';
  roleFilter: string = 'ALL';
  selectedUser: any = null;
  isDrawerOpen: boolean = false;
  doctorPrescriptions: any[] = [];

  get doctors() {
    return this.users.filter(u => u.role === 'DOCTOR').sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  }

  get patients() {
    return this.users.filter(u => u.role === 'PATIENT').sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  }

  get pharmacists() {
    return this.users.filter(u => u.role === 'PHARMACIST').sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  }
  
  exportStartDate: string = '';
  exportEndDate: string = '';
  exportType: string = 'AUDIT';
  exporting: boolean = false;

  sortColumn: string = 'fullName';
  sortDirection: 'asc' | 'desc' = 'asc';

  private charts: any[] = [];

  constructor(private adminService: AdminService) { }

  ngOnInit() {
    this.closeUser360(); // Ensure clean state
    document.body.style.background = '#f8fafc'; // Force white ground
    document.body.style.filter = 'none';
    this.loadInitialData();
  }

  killOverlays() {
    console.log('Emergency UI Reset Triggered');
    this.closeUser360();
    this.isDrawerOpen = false;
    // Bruteforce hide any potential overlays
    const overlays = ['.m-360-overlay', '.drawer-overlay', '.modal-backdrop', '.backdrop', '.glass-overlay'];
    overlays.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => (el as HTMLElement).style.display = 'none');
    });
    // Force clear any stuck blur or filters on body/html
    document.body.style.filter = 'none';
    document.body.style.overflow = 'auto';
    document.body.classList.remove('modal-open');
  }

  getModeTitle(): string {
    switch(this.viewMode) {
      case 'ANALYTICS': return 'Intelligence Hub';
      case 'USERS': return 'User Registry';
      case 'ALERTS': return 'System Sentinel';
      case 'COMPLIANCE': return 'Compliance Center';
      default: return 'Admin Core';
    }
  }

  getModeSubtitle(): string {
    switch(this.viewMode) {
      case 'ANALYTICS': return 'Holistic operational and clinic performance data.';
      case 'USERS': return 'Direct management and platform access controls.';
      case 'ALERTS': return 'Real-time security logs and system audit feed.';
      case 'COMPLIANCE': return 'Official document generation and audit trails.';
      default: return 'MedTrack Enterprise Oversight System.';
    }
  }

  setMode(mode: ViewMode) {
    this.viewMode = mode;
    this.closeUser360();
    if (mode === 'ANALYTICS') {
      setTimeout(() => this.initAnalytics(), 100);
    }
  }

  getCriticalAlertCount(): number {
    if (!this.stats?.recentAlerts) return 0;
    return (this.stats.recentAlerts as any[]).filter(a => a.severity === 'ERROR' || a.severity === 'WARNING').length;
  }

  loadInitialData() {
    this.adminService.getStats().subscribe(data => {
      this.stats = data;
      if (this.viewMode === 'ANALYTICS') {
        setTimeout(() => this.initAnalytics(), 100);
      }
    });

    this.adminService.getAllUsers().subscribe(users => this.users = users);
    this.adminService.getSystemAudits().subscribe(audits => this.systemAudits = audits);
  }

  get filteredUsersList() {
    if (!this.users) return [];
    const q = this.userSearchQuery.toLowerCase();
    let list = this.users;
    
    // Filtering
    if (this.roleFilter !== 'ALL') {
      list = list.filter(u => u.role === (this.roleFilter as any));
    }
    if (q) {
      list = list.filter(u => (u.fullName || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q));
    }

    // Sorting
    return [...list].sort((a, b) => {
      let valA = this.getSortValue(a, this.sortColumn);
      let valB = this.getSortValue(b, this.sortColumn);

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  getSortValue(user: any, column: string): any {
    switch (column) {
      case 'fullName': return (user.fullName || '').toLowerCase();
      case 'role': return user.role;
      case 'active': return user.active ? 1 : 0;
      case 'verified': return user.verified ? 1 : 0;
      case 'adherence': return user.adherenceScore || 0;
      default: return '';
    }
  }

  toggleSort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return 'bi-arrow-down-up opacity-25';
    return this.sortDirection === 'asc' ? 'bi-sort-alpha-down text-primary' : 'bi-sort-alpha-up text-primary';
  }

  openUser360(user: any) { 
    this.selectedUser = user;
    this.isDrawerOpen = true;
    this.doctorPrescriptions = [];
    if (user.role === 'DOCTOR') {
      this.adminService.getDoctorPrescriptions(user.id).subscribe(rx => {
        this.doctorPrescriptions = rx;
      });
    }
  }

  closeUser360() { 
    this.isDrawerOpen = false;
    this.selectedUser = null; 
    this.doctorPrescriptions = []; 
  }

  toggleUserStatus(userId: number) {
    this.adminService.toggleUserStatus(userId).subscribe(updated => {
      this.selectedUser = updated;
      this.loadInitialData();
    });
  }

  saveUserProfile() {
    if (!this.selectedUser) return;
    this.adminService.updateUserProfile(this.selectedUser.id, this.selectedUser).subscribe(() => {
      alert('Profile synced successfully.');
      this.loadInitialData();
    });
  }

  verifyUserFrom360(userId: number) {
    if (confirm('Approve this professional for system access?')) {
      this.adminService.verifyUser(userId).subscribe({
        next: (updated) => {
          this.selectedUser = updated;
          this.loadInitialData();
        },
        error: (err) => alert('Verification failed: ' + (err.error?.message || err.message))
      });
    }
  }

  resetPassword(userId: number) {
    if (confirm("Reset password?")) {
      this.adminService.resetPassword(userId).subscribe(() => alert('Reset to Reset123!'));
    }
  }

  generateAuditReport() {
    this.exporting = true;
    this.adminService.exportOfficialAudit(this.exportType, this.exportStartDate, this.exportEndDate).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Report_${this.exportType}_${new Date().getTime()}.pdf`;
        a.click();
        this.exporting = false;
      },
      error: () => this.exporting = false
    });
  }

  private initAnalytics() {
    if (!this.stats) return; // Safety guard
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    if (this.userDistCanvas) {
      this.charts.push(new Chart(this.userDistCanvas.nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['Patients', 'Doctors', 'Pharma'],
          datasets: [{ data: [this.stats.totalPatients, this.stats.totalDoctors, this.stats.totalPharmacists], backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '70%'}
      }));
    }

    if (this.fulfillmentCanvas) {
      const perfData = this.stats.pharmacistPerformance || {};
      this.charts.push(new Chart(this.fulfillmentCanvas.nativeElement, {
        type: 'bar',
        data: {
          labels: Object.keys(perfData),
          datasets: [{ label: 'Avg Hrs', data: Object.values(perfData), backgroundColor: '#1e3a8a', borderRadius: 10 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      }));
    }

    // Sparklines
    const sparks = [
      { c: this.sparklineUsersCanvas, data: [10, 15, 8, 12, 20, 15, 25], color: '#3b82f6' },
      { c: this.sparklineRxCanvas, data: [5, 12, 18, 10, 15, 22, 30], color: '#10b981' },
      { c: this.sparklineVelocityCanvas, data: [60, 65, 62, 70, 75, 72, 80], color: '#f59e0b' },
      { c: this.sparklineAlertsCanvas, data: [2, 5, 3, 8, 4, 6, 2], color: '#ef4444' }
    ];

    sparks.forEach(s => {
      if (s.c) {
        this.charts.push(new Chart(s.c.nativeElement, {
          type: 'line',
          data: { labels: ['', '', '', '', '', '', ''], datasets: [{ data: s.data, borderColor: s.color, borderWidth: 2, pointRadius: 0, fill: false, tension: 0.4 }] },
          options: { plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } }, responsive: true, maintainAspectRatio: false }
        }));
      }
    });
  }
}
