import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PharmacistService } from '../../services/pharmacist.service';
import { PrescriptionService } from '../../services/prescription.service';
import { Prescription } from '../../models/prescription.model';
import { AuthService } from '../../services/auth.service';
import { MedicationDetailModalComponent } from '../medication-detail-modal/medication-detail-modal.component';

import { RouterModule } from '@angular/router';
import { InventoryService } from '../../services/inventory.service';

@Component({
  selector: 'app-pharmacist-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MedicationDetailModalComponent, RouterModule],
  template: `
    <div class="dashboard-wrapper min-vh-100 pb-5 pt-4">
      <div class="container-fluid px-4 px-lg-5">
        <div class="row mb-4 align-items-center border-bottom border-secondary-subtle pb-3">
          <div class="col">
             <h1 class="m-0 text-dark fw-bold" style="letter-spacing: -0.5px;">Welcome, <span class="text-primary">{{ pharmacistName }}</span></h1>
             <h5 class="text-secondary fw-bold mt-2 mb-0"><i class="bi bi-bezier2 me-2"></i>💊 Pharmacist Dashboard & Dispensing Hub</h5>
             <p class="text-secondary mb-0 mt-2" style="font-size: 0.95rem;">Manage incoming prescription requests directed to you.</p>
          </div>
          <div class="col-auto d-flex gap-2">
             <button class="btn btn-dark rounded-pill px-4 shadow-sm" routerLink="/pharmacist/analytics">
               <i class="bi bi-graph-up-arrow me-2 text-info"></i> View Analytics
             </button>
             <button class="btn btn-outline-dark rounded-pill px-4" (click)="loadQueue()">
               <i class="bi bi-arrow-clockwise me-1"></i> Refresh Queue
             </button>
          </div>
        </div>

        <div *ngIf="error" class="alert alert-danger shadow-sm">{{ error }}</div>

        <div *ngIf="loading" class="text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-2 text-muted">Loading queue...</p>
        </div>

        <!-- Incoming Requests Grid -->
        <h5 class="fw-bold mb-3 text-dark mt-2" style="letter-spacing: -0.3px;">Incoming Requests</h5>
        
        <div *ngIf="incomingRequests.length === 0 && !loading" class="alert alert-light text-center p-5 apollo-card border-0">
           <div class="bg-success-subtle text-success rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 60px; height: 60px;">
              <i class="bi bi-check2-all fs-2"></i>
           </div>
           <h5 class="mt-3 fw-bold text-dark">You're all caught up!</h5>
           <p class="text-secondary mb-0">No pending prescriptions require your immediate attention.</p>
        </div>

        <div *ngIf="incomingRequests.length > 0 && !loading" class="apollo-card border-0 overflow-hidden mb-5 p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead style="background: rgba(248, 250, 252, 0.8); border-bottom: 2px solid rgba(226, 232, 240, 0.8);">
                <tr>
                  <th class="ps-4 py-3 text-secondary text-uppercase fw-bold" style="font-size: 0.75rem; letter-spacing: 0.5px;">Prescription Ref</th>
                  <th class="py-3 text-secondary text-uppercase fw-bold" style="font-size: 0.75rem; letter-spacing: 0.5px;">Patient Email/Name</th>
                  <th class="py-3 text-secondary text-uppercase fw-bold" style="font-size: 0.75rem; letter-spacing: 0.5px;">Prescription Date</th>
                  <th class="py-3 text-secondary text-uppercase fw-bold" style="font-size: 0.75rem; letter-spacing: 0.5px;">Doctor Name</th>
                  <th class="py-3 text-secondary text-uppercase fw-bold" style="font-size: 0.75rem; letter-spacing: 0.5px;">Status</th>
                  <th class="py-3 text-secondary text-uppercase fw-bold text-center" style="font-size: 0.75rem; letter-spacing: 0.5px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of incomingRequests" 
                    (click)="openDrawer(p)" 
                    class="clickable-row transition-all"
                    style="cursor: pointer;">
                  <td class="ps-4 py-3 fw-bold text-dark">
                    #{{ p.id }}
                  </td>
                  <td class="py-3 fw-semibold text-dark">
                    <div class="d-flex align-items-center">
                      <div class="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 30px; height: 30px;">
                        <i class="bi bi-person-fill"></i>
                      </div>
                      <div>
                        <div class="text-truncate" style="max-width: 250px;">{{ p.patient?.fullName || 'Valued Patient' }}</div>
                        <small class="text-secondary">{{ p.patient?.email || p.patientEmail }}</small>
                      </div>
                    </div>
                  </td>
                  <td class="py-3 text-secondary" style="font-size: 0.85rem;">
                    {{ (p.createdAt ? (p.createdAt | date:'dd-MM-yyyy | HH:mm') : '-') }}
                  </td>
                  <td class="py-3 text-dark fw-medium">
                    Dr. {{ (p.doctor?.fullName || 'Unknown').replace('Dr. ', '').replace('DR. ', '') }}
                  </td>
                  <td class="py-3">
                    <span class="badge rounded-pill fw-bold" 
                      [ngStyle]="{'background-color': p.status === 'PROCEEDED_TO_PHARMACIST' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(30, 58, 138, 0.1)', 'color': p.status === 'PROCEEDED_TO_PHARMACIST' ? '#d97706' : '#1e3a8a', 'border': p.status === 'PROCEEDED_TO_PHARMACIST' ? '1px solid #fcd34d' : '1px solid #bfdbfe', 'font-size': '0.7rem', 'padding': '0.4em 1em'}">
                      <i class="bi bi-circle-fill me-1" style="font-size: 0.4rem; vertical-align: middle;"></i>
                      {{ p.status === 'PROCEEDED_TO_PHARMACIST' ? 'IN PREPARATION' : 'AWAITING DISPENSING' }}
                    </span>
                  </td>
                  <td class="py-3 text-center">
                    <div class="d-flex justify-content-center gap-2">
                      <button (click)="$event.stopPropagation(); openDrawer(p)" class="btn btn-sm btn-outline-primary rounded-pill px-3 shadow-sm" style="font-size: 0.75rem;">
                        <i class="bi bi-eye-fill"></i> View Details
                      </button>
                      <button *ngIf="p.filePath" (click)="$event.stopPropagation(); downloadPdf(p.id!)" class="btn btn-sm btn-light rounded-circle border shadow-sm" title="Download PDF">
                        <i class="bi bi-file-earmark-pdf-fill text-danger"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Side Details Drawer -->
        <div class="drawer-overlay" *ngIf="selectedPrescription" (click)="closeDrawer()">
          <div class="drawer-content" (click)="$event.stopPropagation()">
            <!-- Header -->
            <div class="drawer-header d-flex justify-content-between align-items-center">
              <div>
                <h5 class="fw-bold mb-0 text-dark">Prescription Details</h5>
                <small class="text-secondary">Ref ID: #{{ selectedPrescription.id }}</small>
              </div>
              <button class="btn-close" (click)="closeDrawer()"></button>
            </div>

            <!-- Drawer Body -->
            <div class="drawer-body">
              <!-- Patient and Doctor Info Card -->
              <div class="info-card p-3 mb-4">
                <div class="row g-3">
                  <div class="col-12 border-bottom pb-2">
                    <small class="text-secondary d-block uppercase-label mb-1">Patient Details</small>
                    <div class="fw-bold text-dark">{{ selectedPrescription.patient?.fullName || 'Valued Patient' }}</div>
                    <div class="text-secondary small">{{ selectedPrescription.patient?.email || selectedPrescription.patientEmail }}</div>
                  </div>
                  <div class="col-12">
                    <small class="text-secondary d-block uppercase-label mb-1">Doctor Details</small>
                    <div class="fw-bold text-dark">Dr. {{ (selectedPrescription.doctor?.fullName || 'Unknown').replace('Dr. ', '').replace('DR. ', '') }}</div>
                    <div class="text-secondary small">{{ selectedPrescription.doctor?.specialization || 'General Practitioner' }}</div>
                  </div>
                </div>
              </div>

              <!-- Action Required Section -->
              <div *ngIf="selectedPrescription.status === 'ISSUED'" class="text-center p-4 bg-light rounded-4 border border-warning-subtle mb-4">
                <i class="bi bi-info-circle text-warning fs-3 mb-2 d-block"></i>
                <h6 class="fw-bold text-dark">Action Required: Accept Request</h6>
                <p class="text-secondary small">You need to accept this prescription request before you can verify medicine stock and dispense.</p>
                <button (click)="accept(selectedPrescription.id!)" class="btn btn-warning w-100 rounded-pill fw-bold py-2 mt-2">
                  <i class="bi bi-box-arrow-in-down-right me-2"></i> Accept Request
                </button>
              </div>

              <!-- Stock Verification Section -->
              <div *ngIf="selectedPrescription.status === 'PROCEEDED_TO_PHARMACIST'">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <h6 class="fw-bold mb-0 text-dark">Verify Stock (Medicine-by-Medicine)</h6>
                  <span class="badge" [ngClass]="isAllVerified(selectedPrescription) ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'">
                    {{ isAllVerified(selectedPrescription) ? 'All Verified' : 'Pending Verification' }}
                  </span>
                </div>

                <!-- Auto-Verify Stock Button -->
                <div class="mb-3">
                  <button 
                    [disabled]="isAutoVerifying"
                    (click)="autoVerifyStock(selectedPrescription)" 
                    class="btn btn-primary btn-sm w-100 rounded-pill py-2 shadow-sm fw-bold d-flex align-items-center justify-content-center gap-2" 
                    style="background: linear-gradient(135deg, #2563eb, #1d4ed8); border: none;">
                    <span *ngIf="isAutoVerifying" class="spinner-border spinner-border-sm" role="status" style="width: 1rem; height: 1rem;"></span>
                    <i *ngIf="!isAutoVerifying" class="bi bi-magic text-info"></i>
                    <span>{{ isAutoVerifying ? 'Auto-Verifying Stock...' : 'Auto-Verify Stock via Inventory' }}</span>
                  </button>
                </div>

                <div class="medicine-verify-list d-flex flex-column gap-3 mb-4">
                  <div *ngFor="let item of selectedPrescription.items" class="medicine-item-card p-3 border rounded-3 bg-white shadow-sm position-relative">
                    <div class="d-flex justify-content-between align-items-start">
                      <div>
                        <div class="fw-bold text-dark d-flex align-items-center">
                          {{ item.medicineName }}
                          <span class="badge ms-2" [ngClass]="item.available === true ? 'bg-success-subtle text-success border border-success' : (item.available === false ? 'bg-danger-subtle text-danger border border-danger' : 'bg-secondary-subtle text-secondary border')">
                            {{ item.available === true ? 'In Stock' : (item.available === false ? 'Out of Stock' : 'Unverified') }}
                          </span>
                        </div>
                        <div class="text-secondary small mt-1">Dosage: {{ item.dosage }} | Qty: {{ item.quantity }}</div>
                        <div class="text-secondary small">Instructions: {{ item.dosageTiming || 'As directed' }}</div>
                        
                        <!-- System Stock Info -->
                        <div class="mt-2 p-2 rounded-3 border" 
                             [ngStyle]="{
                               'background-color': getStockInfo(item.medicineName) ? (getStockInfo(item.medicineName)!.stockQuantity >= item.quantity ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)') : 'rgba(241, 245, 249, 0.9)',
                               'border-color': getStockInfo(item.medicineName) ? (getStockInfo(item.medicineName)!.stockQuantity >= item.quantity ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)') : 'rgba(226, 232, 240, 1)'
                             }"
                             style="font-size: 0.85rem;">
                          <div class="d-flex justify-content-between align-items-center">
                            <span class="text-secondary fw-semibold">
                              <i class="bi bi-box-seam me-1"></i> System Stock:
                            </span>
                            <span class="fw-bold" 
                                  [ngClass]="getStockInfo(item.medicineName) ? (getStockInfo(item.medicineName)!.stockQuantity >= item.quantity ? 'text-success' : 'text-danger') : 'text-muted'">
                              {{ getStockInfo(item.medicineName) ? (getStockInfo(item.medicineName)!.stockQuantity + ' units') : 'Not Found in Inventory' }}
                            </span>
                          </div>
                          <div *ngIf="getStockInfo(item.medicineName)" class="d-flex justify-content-between align-items-center mt-1">
                            <span class="text-secondary fw-semibold">
                              <i class="bi bi-tag me-1"></i> Unit Price:
                            </span>
                            <span class="text-dark fw-bold">
                              ₹{{ getStockInfo(item.medicineName)!.unitPrice.toFixed(2) }}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <button class="btn btn-sm btn-link text-primary p-0 text-decoration-none" style="font-size: 0.75rem;" (click)="openInfoModal(item.medicineName)">
                          <i class="bi bi-info-circle-fill"></i> Info
                        </button>
                      </div>
                    </div>

                    <!-- Toggle Buttons -->
                    <div class="d-flex gap-2 mt-3 pt-2 border-top">
                      <button 
                        type="button"
                        [disabled]="verifyingItemId === item.id || isAutoVerifying"
                        [ngClass]="item.available === true ? 'btn-success text-white' : 'btn-outline-success'"
                        class="btn btn-sm flex-fill rounded-pill d-flex align-items-center justify-content-center gap-1 fw-bold transition-all"
                        (click)="toggleAvailability(selectedPrescription, item, true)">
                        <i class="bi" [ngClass]="item.available === true ? 'bi-check-circle-fill' : 'bi-check-circle'"></i>
                        Available
                      </button>
                      <button 
                        type="button"
                        [disabled]="verifyingItemId === item.id || isAutoVerifying"
                        [ngClass]="item.available === false ? 'btn-danger text-white' : 'btn-outline-danger'"
                        class="btn btn-sm flex-fill rounded-pill d-flex align-items-center justify-content-center gap-1 fw-bold transition-all"
                        (click)="toggleAvailability(selectedPrescription, item, false)">
                        <i class="bi" [ngClass]="item.available === false ? 'bi-x-circle-fill' : 'bi-x-circle'"></i>
                        Not Available
                      </button>
                    </div>
                    
                    <div *ngIf="verifyingItemId === item.id" class="position-absolute top-50 start-50 translate-middle">
                      <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                    </div>
                  </div>
                </div>

                <!-- PDF Download Button inside Drawer when available -->
                <div *ngIf="selectedPrescription.filePath" class="mb-3 border-top pt-3">
                  <button 
                    (click)="downloadPdf(selectedPrescription.id!)"
                    class="btn btn-outline-danger w-100 py-2 rounded-pill shadow-sm fw-bold d-flex align-items-center justify-content-center gap-2">
                    <i class="bi bi-file-earmark-pdf-fill"></i>
                    <span>Download Prescription PDF</span>
                  </button>
                </div>

                <!-- Dispense and Cost form -->
                <div class="dispense-form border-top pt-3 mt-3">
                  <div class="mb-3">
                    <label class="form-label small fw-bold text-secondary text-uppercase">Total Cost (INR)</label>
                    <div class="input-group">
                      <span class="input-group-text bg-light border-end-0">₹</span>
                      <input type="number" class="form-control" placeholder="Enter custom billing amount or leave empty for auto-calc" [(ngModel)]="selectedPrescription.totalCost">
                    </div>
                    <div class="form-text small text-secondary mt-1">If empty, cost will auto-calculate based on inventory unit prices.</div>
                  </div>

                  <div *ngIf="!isAllVerified(selectedPrescription)" class="alert alert-warning py-2 px-3 small border-0 mb-3 d-flex align-items-center gap-2">
                    <i class="bi bi-exclamation-triangle-fill text-warning"></i>
                    <span>Dispensing locked. Verify stock for all medicines first.</span>
                  </div>

                  <button 
                    [disabled]="!isAllVerified(selectedPrescription) || isAutoVerifying"
                    (click)="dispense(selectedPrescription)" 
                    class="btn btn-success w-100 py-3 rounded-pill shadow-sm fw-bold d-flex align-items-center justify-content-center gap-2" 
                    style="background: linear-gradient(135deg, #10b981, #059669); border: none;">
                    <i class="bi" [ngClass]="!isAllVerified(selectedPrescription) ? 'bi-lock-fill' : 'bi-check2-circle'"></i>
                    <span>Dispense Medication</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Historical Dispensed -->
        <h5 class="fw-bold mb-3 mt-5 text-dark" style="letter-spacing: -0.3px;">Recently Dispensed</h5>
        <div class="d-flex flex-column gap-2 mb-5">
          <div *ngFor="let p of dispensedRequests" class="apollo-card p-3 d-flex justify-content-between align-items-center border-start border-4 shadow-sm" style="border-left-color: #10b981 !important; border-radius: 8px;">
              <div>
                 <h6 class="fw-bold mb-1 text-dark" style="font-size: 0.95rem;">Prescription #{{ p.id }} <span class="badge ms-2 bg-success-subtle text-success border border-success-subtle rounded-pill">Treatment Active</span></h6>
                 <small class="text-secondary fw-medium">Patient: {{ p.patient?.email || p.patientEmail }} <span class="mx-1">•</span> <i class="bi bi-clock"></i> {{ p.dispensedAt | date:'medium' }}</small>
              </div>
              <button class="btn btn-light rounded-circle border shadow-sm" (click)="downloadPdf(p.id!)"><i class="bi bi-download text-primary"></i></button>
          </div>
          <div *ngIf="dispensedRequests.length === 0" class="text-secondary small text-center py-4">No recently dispensed medications found.</div>
        </div>
      </div>
    </div>

    <!-- Safety Information Modal -->
    <app-medication-detail-modal
        [isOpen]="isModalOpen"
        [drugName]="selectedDrugName"
        viewMode="pharmacist"
        (closeEvent)="closeInfoModal()">
    </app-medication-detail-modal>
  `,
  styles: [`
    .dashboard-wrapper {
      background: linear-gradient(135deg, #f8f9fa 0%, #e2e8f0 100%);
    }
    .apollo-card {
      background: rgba(255, 255, 255, 0.85);
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
      border: 1px solid rgba(255,255,255,1);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      padding: 18px 24px;
    }
    .apollo-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 15px 35px rgba(0,0,0,0.08);
        background: rgba(255, 255, 255, 0.95);
    }
    .uppercase-label {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-weight: 700;
    }
    .compact-table th {
      color: #64748b !important;
    }
    .compact-table td {
      font-size: 0.85rem;
    }
    .clickable-row:hover {
      background-color: rgba(37, 99, 235, 0.04) !important;
    }
    .drawer-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1050;
      display: flex;
      justify-content: flex-end;
      animation: fadeIn 0.3s ease-out;
    }
    .drawer-content {
      width: 100%;
      max-width: 500px;
      height: 100%;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      border-left: 1px solid rgba(255, 255, 255, 0.5);
      box-shadow: -10px 0 40px rgba(0, 0, 0, 0.12);
      display: flex;
      flex-direction: column;
      animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .drawer-header {
      padding: 1.5rem;
      border-bottom: 1px solid rgba(0,0,0,0.06);
    }
    .drawer-body {
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }
    .info-card {
      background: rgba(248, 250, 252, 0.9);
      border: 1px solid rgba(226, 232, 240, 0.9);
      border-radius: 12px;
    }
    .medicine-item-card {
      transition: all 0.2s ease;
      background: #ffffff;
      border: 1px solid rgba(226, 232, 240, 0.9);
    }
    .medicine-item-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 15px rgba(0,0,0,0.05) !important;
      border-color: rgba(37, 99, 235, 0.3);
    }
    .btn-close {
      background-color: transparent;
      border: 0;
      font-size: 1.5rem;
      cursor: pointer;
    }
    .transition-all {
      transition: all 0.2s ease-in-out;
    }
    .animate-fade {
      animation: fadeIn 0.4s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
  `]
})
export class PharmacistDashboardComponent implements OnInit {
  incomingRequests: Prescription[] = [];
  dispensedRequests: Prescription[] = [];
  error: string | null = null;
  loading: boolean = true;

  // Selected prescription for side drawer
  selectedPrescription: Prescription | null = null;
  verifyingItemId: number | null = null;

  // Modal State
  isModalOpen = false;
  selectedDrugName = '';

  pharmacistName: string = '';

  medicineStockMap: Map<string, { stockQuantity: number, unitPrice: number }> = new Map();
  isAutoVerifying: boolean = false;

  constructor(
    private pharmacistService: PharmacistService,
    private prescriptionService: PrescriptionService,
    private authService: AuthService,
    private inventoryService: InventoryService
  ) { }

  ngOnInit(): void {
    const profile = this.authService.getProfile();
    this.pharmacistName = profile?.fullName || 'Pharmacist';
    this.loadQueue();
  }

  loadInventory() {
    // 1. Fetch general medicine catalog for unit prices
    this.pharmacistService.getInventory().subscribe({
      next: (medicines) => {
        const pricesMap = new Map<string, number>();
        if (medicines) {
          medicines.forEach(m => {
            if (m.name) {
              pricesMap.set(m.name.toLowerCase().trim(), m.unitPrice || 0);
            }
          });
        }

        // 2. Fetch pharmacist's batch-wise inventory for actual stock quantities
        const profile = this.authService.getProfile();
        if (profile && profile.id) {
          this.inventoryService.getPharmacistInventory(profile.id).subscribe({
            next: (inventoryItems) => {
              this.medicineStockMap.clear();
              if (inventoryItems) {
                inventoryItems.forEach(item => {
                  if (item.drugName) {
                    const key = item.drugName.toLowerCase().trim();
                    const existing = this.medicineStockMap.get(key);
                    const qty = item.quantity || 0;
                    const price = pricesMap.get(key) || 10.0; // Fallback price to 10.0 INR if not in catalog

                    if (item.status === 'ACTIVE' || item.status === 'LOW_STOCK') {
                      if (existing) {
                        existing.stockQuantity += qty;
                      } else {
                        this.medicineStockMap.set(key, {
                          stockQuantity: qty,
                          unitPrice: price
                        });
                      }
                    }
                  }
                });
              }
            },
            error: (err) => {
              console.error('Failed to load pharmacist inventory:', err);
            }
          });
        }
      },
      error: (err) => {
        console.error('Failed to load general inventory catalog:', err);
      }
    });
  }

  getStockInfo(medicineName: string) {
    if (!medicineName) return null;
    return this.medicineStockMap.get(medicineName.toLowerCase().trim()) || null;
  }

  autoVerifyStock(prescription: Prescription) {
    if (!prescription || !prescription.items || prescription.items.length === 0) return;
    
    this.isAutoVerifying = true;
    this.error = null;
    
    // Create a copy of the items queue that need verification
    const itemsToVerify = [...prescription.items];
    
    const verifyNext = () => {
      if (itemsToVerify.length === 0) {
        this.isAutoVerifying = false;
        this.loadInventory(); // Refresh local stock numbers
        return;
      }
      
      const item = itemsToVerify.shift();
      if (!item || !item.id) {
        verifyNext();
        return;
      }
      
      const stockInfo = this.getStockInfo(item.medicineName);
      const isAvailable = stockInfo ? (stockInfo.stockQuantity >= item.quantity) : false;
      
      this.verifyingItemId = item.id;
      this.pharmacistService.updateItemAvailability(item.id, isAvailable).subscribe({
        next: (updatedPrescription) => {
          this.verifyingItemId = null;
          
          // Update prescription state locally
          const pIndex = this.incomingRequests.findIndex(pr => pr.id === prescription.id);
          if (pIndex !== -1) {
            this.incomingRequests[pIndex] = updatedPrescription;
          }
          if (this.selectedPrescription && this.selectedPrescription.id === prescription.id) {
            this.selectedPrescription = updatedPrescription;
          }
          
          // Continue to next item in queue
          verifyNext();
        },
        error: (err) => {
          this.verifyingItemId = null;
          console.error(`Failed to auto-verify item ${item.medicineName}:`, err);
          // Even on failure, continue processing remaining items so we don't block everything
          verifyNext();
        }
      });
    };
    
    verifyNext();
  }

  loadQueue() {
    this.loading = true;
    this.error = null;
    this.loadInventory();
    this.prescriptionService.getPharmacistQueue().subscribe({
      next: (data) => {
        this.incomingRequests = data.filter(p => p.status === 'ISSUED' || p.status === 'PROCEEDED_TO_PHARMACIST');
        // Sort processing to the top
        this.incomingRequests.sort((a, b) => (b.id || 0) - (a.id || 0));

        this.dispensedRequests = data.filter(p => p.status === 'DISPENSED');
        
        // If drawer is open, find the updated prescription from the queue and refresh it
        if (this.selectedPrescription) {
          const updated = this.incomingRequests.find(pr => pr.id === this.selectedPrescription!.id);
          if (updated) {
            this.selectedPrescription = updated;
          }
        }
        
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load queue. Please try again.';
        this.loading = false;
      }
    });
  }

  openDrawer(p: Prescription) {
    this.selectedPrescription = p;
  }

  closeDrawer() {
    this.selectedPrescription = null;
  }

  isAllVerified(p: Prescription): boolean {
    if (!p || !p.items || p.items.length === 0) return false;
    return p.items.every(item => item.available === true || item.available === false);
  }

  toggleAvailability(prescription: Prescription, item: any, available: boolean) {
    if (!item.id) return;
    this.verifyingItemId = item.id;
    this.pharmacistService.updateItemAvailability(item.id, available).subscribe({
      next: (updatedPrescription) => {
        this.verifyingItemId = null;
        
        // Update local items in incomingRequests list
        const pIndex = this.incomingRequests.findIndex(pr => pr.id === prescription.id);
        if (pIndex !== -1) {
          this.incomingRequests[pIndex] = updatedPrescription;
        }
        
        // Update selectedPrescription
        if (this.selectedPrescription && this.selectedPrescription.id === prescription.id) {
          this.selectedPrescription = updatedPrescription;
        }
      },
      error: (err) => {
        this.verifyingItemId = null;
        alert('Failed to update stock status: ' + (err.error || 'Unknown error'));
      }
    });
  }

  accept(id: number) {
    this.pharmacistService.acceptPrescription(id).subscribe({
      next: (updatedPrescription) => {
        this.loadQueue();
        if (this.selectedPrescription && this.selectedPrescription.id === id) {
          this.selectedPrescription = updatedPrescription;
        }
      },
      error: (err) => alert('Failed to accept: ' + (err.error || 'Unknown error'))
    });
  }

  dispense(p: Prescription) {
    if (!p.id) return;
    this.pharmacistService.dispensePrescription(p.id, p.totalCost).subscribe({
      next: () => {
        this.closeDrawer();
        this.loadQueue();
      },
      error: (err) => alert('Failed to dispense: ' + (err.error || 'Unknown error'))
    });
  }

  downloadPdf(id: number) {
    this.pharmacistService.downloadPrescription(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Prescription-${id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => alert('Failed to download PDF')
    });
  }

  openInfoModal(drugName: string): void {
      this.selectedDrugName = drugName;
      this.isModalOpen = true;
  }

  closeInfoModal(): void {
      this.isModalOpen = false;
      this.selectedDrugName = '';
  }
}
