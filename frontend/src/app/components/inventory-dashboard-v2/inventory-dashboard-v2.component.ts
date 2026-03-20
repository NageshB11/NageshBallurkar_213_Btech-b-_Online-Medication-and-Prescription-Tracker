import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InventoryService, Inventory } from '../../services/inventory.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-inventory-dashboard-v2',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="inventory-root animate-fade-in">
      <div class="container-fluid py-5 px-4 px-md-5">
        
        <!-- Premium Header Area -->
        <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-end mb-5 gap-4">
          <div class="header-content">
            <nav aria-label="breadcrumb" class="mb-2">
              <ol class="breadcrumb bg-transparent p-0 mb-0">
                <li class="breadcrumb-item"><a href="#" class="text-decoration-none text-muted small fw-bold">Pharmacist</a></li>
                <li class="breadcrumb-item active small fw-bold text-primary" aria-current="page">Inventory Management</li>
              </ol>
            </nav>
            <h1 class="header-title mb-1">Stock Custodian Dashboard</h1>
            <p class="header-subtitle mb-0">Live traceability & algorithmic stock monitoring</p>
          </div>
          
          <div class="header-actions d-flex gap-2">
            <button class="btn-apollo-secondary" (click)="exportInventory()">
              <i class="bi bi-download me-2"></i> Export Report
            </button>
            <button class="btn-apollo-primary shadow-lg" (click)="openModal()">
              <i class="bi bi-plus-lg me-2"></i> New Stock Entry
            </button>
          </div>
        </div>

        <!-- Analytical Pulse Cards -->
        <div class="row g-4 mb-5">
          <div class="col-12 col-md-6 col-xl-3">
            <div class="pulse-card glass-card h-100" (click)="setStatusFilter('')" [class.active-filter]="!statusFilter">
              <div class="card-glow primary"></div>
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div class="pulse-icon blue"><i class="bi bi-layers"></i></div>
                <div class="pulse-trend text-success"><i class="bi bi-graph-up me-1"></i> +2.4%</div>
              </div>
              <div class="pulse-data">
                <span class="pulse-value">{{ inventory.length }}</span>
                <span class="pulse-label">Total Inventory Units</span>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-6 col-xl-3">
            <div class="pulse-card glass-card h-100" (click)="setStatusFilter('ACTIVE')" [class.active-filter]="statusFilter === 'ACTIVE'">
              <div class="card-glow success"></div>
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div class="pulse-icon green"><i class="bi bi-shield-check"></i></div>
                <div class="pulse-trend text-success"><i class="bi bi-check-all me-1"></i> Stable</div>
              </div>
              <div class="pulse-data">
                <span class="pulse-value">{{ getCountByStatus('ACTIVE') }}</span>
                <span class="pulse-label">Healthy Supply</span>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-6 col-xl-3">
            <div class="pulse-card glass-card h-100" (click)="setStatusFilter('LOW_STOCK')" [class.active-filter]="statusFilter === 'LOW_STOCK'">
              <div class="card-glow warning"></div>
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div class="pulse-icon amber"><i class="bi bi-lightning-charge"></i></div>
                <div class="pulse-trend text-danger"><i class="bi bi-arrow-down me-1"></i> Risk</div>
              </div>
              <div class="pulse-data">
                <span class="pulse-value text-warning">{{ getCountByStatus('LOW_STOCK') }}</span>
                <span class="pulse-label">Critical Thresholds</span>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-6 col-xl-3">
            <div class="pulse-card glass-card h-100" (click)="setStatusFilter('EXPIRED')" [class.active-filter]="statusFilter === 'EXPIRED'">
              <div class="card-glow danger"></div>
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div class="pulse-icon red"><i class="bi bi-clock-history"></i></div>
                <div class="pulse-trend text-danger"><i class="bi bi-slash-circle me-1"></i> Action</div>
              </div>
              <div class="pulse-data">
                <span class="pulse-value text-danger">{{ getCountByStatus('EXPIRED') }}</span>
                <span class="pulse-label">Expired Disposal</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Professional Data Grid -->
        <div class="grid-container shadow-2xl animate-slide-up">
          <div class="grid-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div class="d-flex align-items-center gap-3">
              <h5 class="grid-title m-0">Traceability Matrix</h5>
              <div class="v-divider"></div>
              <div class="filter-count small fw-bold text-muted">Showing {{ filteredInventory.length }} entries</div>
            </div>
            
            <div class="grid-tools d-flex gap-3">
              <div class="search-input-wrap">
                <i class="bi bi-search"></i>
                <input type="text" class="search-input" placeholder="Search drug, batch, or status..." [(ngModel)]="searchQuery" (input)="filterInventory()">
              </div>
              <button class="btn-tool" title="Refresh" (click)="loadInventory()">
                <i class="bi bi-arrow-clockwise"></i>
              </button>
            </div>
          </div>

          <div class="table-wrapper">
            <table class="apollo-professional-table">
              <thead>
                <tr>
                  <th class="ps-5">Clinical Product</th>
                  <th>Manufacturing Details</th>
                  <th>Availability Control</th>
                  <th>Clinical Status</th>
                  <th class="pe-5 text-end">Managed Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of filteredInventory" class="data-row">
                  <td class="ps-5">
                    <div class="d-flex align-items-center gap-3 py-2">
                      <div class="product-symbol shadow-sm" [ngClass]="item.status">
                        <i class="bi bi-capsule"></i>
                      </div>
                      <div>
                        <div class="product-name">{{ item.drugName }}</div>
                        <div class="product-meta">SKU: #{{ item.id | number:'4.0' }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="batch-pill"><i class="bi bi-tag-fill me-1"></i> {{ item.batchNo }}</div>
                    <div class="small mt-1 mt-md-0 fw-bold" [ngClass]="item.status === 'EXPIRED' ? 'text-danger' : 'text-secondary'">
                       Expires: {{ item.expiryDate | date:'MMM dd, yyyy' }}
                    </div>
                    <div *ngIf="item.status === 'EXPIRED'" class="disposal-alert mt-2">
                      <i class="bi bi-exclamation-triangle-fill"></i> Protocol: Dispose & Replace Batch
                    </div>
                  </td>
                  <td>
                    <div class="d-flex align-items-center gap-2 mb-2">
                       <span class="qty-count" [ngClass]="item.status === 'LOW_STOCK' ? 'low' : ''">{{ item.quantity }}</span> 
                       <span class="qty-unit">UNITS</span>
                    </div>
                    <div class="apollo-progress-track">
                      <div class="apollo-progress-thumb" 
                           [ngClass]="item.status"
                           [style.width.%]="getPercent(item)"></div>
                    </div>
                    <div class="small text-muted mt-1 fw-bold opacity-75" style="font-size: 0.65rem; text-transform: uppercase;">
                      Limit: {{ item.threshold }} units
                    </div>
                  </td>
                  <td>
                    <div class="apollo-status-chip shadow-sm" [ngClass]="item.status">
                      <div class="status-dot"></div>
                      {{ item.status.replace('_', ' ') }}
                    </div>
                  </td>
                  <td class="pe-5 text-end">
                    <div class="action-dock">
                      <button class="btn-action" (click)="editItem(item)" title="Modify Batch" *ngIf="item.status !== 'EXPIRED'">
                        <i class="bi bi-sliders"></i>
                      </button>
                      <button class="btn-action danger dispose-btn" (click)="deleteItem(item)" [title]="item.status === 'EXPIRED' ? 'Safe Disposal' : 'Archive Stock'">
                        <i class="bi" [ngClass]="item.status === 'EXPIRED' ? 'bi-shield-x' : 'bi-trash3'"></i>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="filteredInventory.length === 0">
                  <td colspan="5" class="py-5 text-center">
                    <div class="empty-state py-5">
                      <div class="empty-icon-wrap mb-4">
                        <i class="bi bi-database-exclamation pulse-animation"></i>
                      </div>
                      <h4 class="fw-800 text-dark mb-2">No Records Found</h4>
                      <p class="text-muted">Adjust your search parameters or add a new inventory batch.</p>
                      <button class="btn-apollo-outline mt-3" (click)="searchQuery=''; loadInventory()">Clear Filters</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Add/Edit Modal (Premium Glass) -->
      <div class="apollo-modal-root" *ngIf="isModalOpen" (click)="closeModal()">
        <div class="apollo-modal-content animate-slide-up" (click)="$event.stopPropagation()">
          <div class="apollo-modal-header d-flex align-items-center justify-content-between">
            <div>
              <h4 class="mb-1 fw-800 text-primary">{{ isEditMode ? 'Update Batch Ledger' : 'New Inventory Record' }}</h4>
              <p class="mb-0 small text-muted">Clinical Compliance Protocol</p>
            </div>
            <button class="btn-modal-close" (click)="closeModal()"><i class="bi bi-x-lg"></i></button>
          </div>
          
          <div class="apollo-modal-body p-4 p-md-5">
            <form (ngSubmit)="saveItem()" #inventoryForm="ngForm">
              <div class="row g-4">
                <div class="col-12">
                  <div class="apollo-input-group">
                    <label>Medication Name</label>
                    <div class="input-container">
                      <i class="bi bi-capsule-pill"></i>
                      <input type="text" [(ngModel)]="currentItem.drugName" name="drugName" required placeholder="Enter professional drug name...">
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="apollo-input-group">
                    <label>Batch Code</label>
                    <div class="input-container">
                      <i class="bi bi-qr-code"></i>
                      <input type="text" [(ngModel)]="currentItem.batchNo" name="batchNo" required placeholder="e.g. BTC-9923">
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="apollo-input-group">
                    <label>Expiry Date</label>
                    <div class="input-container">
                      <i class="bi bi-calendar-event"></i>
                      <input type="date" [(ngModel)]="currentItem.expiryDate" name="expiryDate" required>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="apollo-input-group">
                    <label>In-Stock Quantity</label>
                    <div class="input-container">
                      <i class="bi bi-box-seam"></i>
                      <input type="number" [(ngModel)]="currentItem.quantity" name="quantity" required>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="apollo-input-group">
                    <label>Low Stock Alert Limit</label>
                    <div class="input-container">
                      <i class="bi bi-bell-ringing"></i>
                      <input type="number" [(ngModel)]="currentItem.threshold" name="threshold" required>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="modal-footer-apollo d-flex justify-content-end gap-3 mt-5 pt-4">
                <button type="button" class="btn-apollo-secondary" (click)="closeModal()">Abort Change</button>
                <button type="submit" class="btn-apollo-primary px-5 shadow-lg" [disabled]="!inventoryForm.form.valid">
                  {{ isEditMode ? 'Commit Changes' : 'Initialize Record' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --primary: #0056b3;
      --primary-glow: rgba(0, 86, 179, 0.3);
      --success: #10b981;
      --success-glow: rgba(16, 185, 129, 0.3);
      --warning: #f59e0b;
      --warning-glow: rgba(245, 158, 11, 0.3);
      --danger: #ef4444;
      --danger-glow: rgba(239, 68, 68, 0.3);
      --glass: var(--glass-bg);
      --text-main: #2d3436;
      --text-muted: #636e72;
    }

    .inventory-root {
      min-height: 100vh;
      background: #f8fafc;
      font-family: 'Outfit', sans-serif;
      color: var(--text-main);
    }

    .header-title { font-weight: 800; color: #1e3a8a; letter-spacing: -1.5px; font-size: 2.5rem; }
    .header-subtitle { color: var(--text-muted); font-size: 1.1rem; font-weight: 500; }

    /* Pulse Cards */
    .pulse-card {
      padding: 30px;
      border-radius: 28px;
      position: relative;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
      border: var(--glass-border);
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
    }
    .pulse-card:hover { 
      transform: translateY(-10px); 
      box-shadow: var(--shadow-hover);
      background: white;
    }
    .pulse-card.active-filter { border: 2px solid var(--primary); box-shadow: 0 0 20px var(--primary-glow); }

    .pulse-icon { width: 56px; height: 56px; border-radius: 18px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    .pulse-icon.blue { background: #eff6ff; color: #2563eb; }
    .pulse-icon.green { background: #ecfdf5; color: #10b981; }
    .pulse-icon.amber { background: #fffbeb; color: #d97706; }
    .pulse-icon.red { background: #fef2f2; color: #dc2626; }

    .pulse-value { font-size: 2.2rem; font-weight: 800; display: block; line-height: 1; margin-bottom: 4px; }
    .pulse-label { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }

    .card-glow { position: absolute; top: -50px; right: -50px; width: 120px; height: 120px; border-radius: 50%; opacity: 0.1; filter: blur(30px); }
    .card-glow.primary { background: var(--primary); }
    .card-glow.success { background: var(--success); }
    .card-glow.warning { background: var(--warning); }
    .card-glow.danger { background: var(--danger); }

    /* Professional Grid */
    .grid-container {
      background: var(--glass);
      backdrop-filter: blur(30px);
      border-radius: 35px;
      border: 1px solid rgba(255,255,255,0.7);
      padding: 0;
      overflow: hidden;
      margin-bottom: 50px;
    }

    .grid-header { padding: 30px 40px; border-bottom: 1px solid rgba(226, 232, 240, 0.6); background: rgba(255,255,255,0.4); }
    .grid-title { font-weight: 800; color: #1e293b; letter-spacing: -0.5px; }
    .v-divider { width: 1px; height: 24px; background: #cbd5e1; }

    .search-input-wrap { position: relative; width: 320px; }
    .search-input-wrap i { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
    .search-input { width: 100%; padding: 12px 20px 12px 48px; border-radius: 16px; border: 1.5px solid transparent; background: #f1f5f9; font-weight: 600; font-size: 0.9rem; transition: all 0.2s; }
    .search-input:focus { background: white; border-color: var(--primary); outline: none; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.08); }

    .apollo-professional-table { width: 100%; border-collapse: separate; border-spacing: 0; }
    .apollo-professional-table th { padding: 22px 16px; font-weight: 800; color: #475569; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 1.2px; background: rgba(248, 250, 252, 0.8); }
    .apollo-professional-table td { padding: 20px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .data-row { transition: all 0.2s; }
    .data-row:hover td { background: rgba(241, 245, 249, 0.5); }

    .product-symbol { width: 44px; height: 44px; border-radius: 15px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; background: #f1f5f9; }
    .product-symbol.ACTIVE { color: var(--success); background: #f0fdf4; }
    .product-symbol.LOW_STOCK { color: var(--warning); background: #fffbeb; }
    .product-symbol.EXPIRED { color: var(--danger); background: #fef2f2; }

    .product-name { font-weight: 800; color: #0f172a; font-size: 1rem; }
    .product-meta { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }

    .batch-pill { background: #1e293b; color: white; padding: 4px 12px; border-radius: 8px; font-size: 0.7rem; font-weight: 700; width: fit-content; margin-bottom: 4px; }
    
    .qty-count { font-size: 1.15rem; font-weight: 850; color: #1e293b; }
    .qty-count.low { color: var(--danger); }
    .qty-unit { font-size: 0.65rem; font-weight: 800; color: var(--text-muted); margin-left: 4px; }

    .apollo-progress-track { width: 140px; height: 8px; background: #f1f5f9; border-radius: 10px; overflow: hidden; }
    .apollo-progress-thumb { height: 100%; border-radius: 10px; transition: width 1s cubic-bezier(0.1, 0, 0.1, 1); }
    .apollo-progress-thumb.ACTIVE { background: linear-gradient(90deg, #10b981, #34d399); }
    .apollo-progress-thumb.LOW_STOCK { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    .apollo-progress-thumb.EXPIRED { background: linear-gradient(90deg, #ef4444, #f87171); }

    .apollo-status-chip { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 14px; font-size: 0.75rem; font-weight: 800; border: 1px solid transparent; text-transform: capitalize; }
    .apollo-status-chip.ACTIVE { color: #065f46; background: #ecfdf5; border-color: #d1fae5; }
    .apollo-status-chip.LOW_STOCK { color: #92400e; background: #fffbeb; border-color: #fef3c7; }
    .apollo-status-chip.EXPIRED { color: #991b1b; background: #fef2f2; border-color: #fee2e2; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; }
    .ACTIVE .status-dot { background: var(--success); box-shadow: 0 0 10px var(--success-glow); }
    .LOW_STOCK .status-dot { background: var(--warning); box-shadow: 0 0 10px var(--warning-glow); }
    .EXPIRED .status-dot { background: var(--danger); box-shadow: 0 0 10px var(--danger-glow); }

    /* Action Dock */
    .action-dock { display: flex; gap: 10px; justify-content: flex-end; }
    .btn-action { width: 40px; height: 40px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: white; color: #475569; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; transition: all 0.2s; }
    .btn-action:hover { border-color: var(--primary); color: var(--primary); background: #eff6ff; }
    .btn-action.danger:hover { border-color: var(--danger); color: var(--danger); background: #fef2f2; }
    .btn-action.dispose-btn[title="Safe Disposal"] { border-color: var(--danger); color: var(--danger); background: #fef2f2; animation: pulseAlert 2s infinite; }

    .disposal-alert {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: #fef2f2;
      color: #b91c1c;
      border: 1px solid #fca5a5;
      border-radius: 8px;
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.5px;
      animation: pulseAlert 2s infinite;
    }
    @keyframes pulseAlert {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
      70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }

    /* Premium Buttons */
    .btn-apollo-primary { background: #2563eb; color: white; border: none; padding: 14px 28px; border-radius: 18px; font-weight: 800; font-size: 0.95rem; transition: all 0.3s; }
    .btn-apollo-primary:hover { transform: translateY(-4px); background: #1d4ed8; box-shadow: 0 10px 20px var(--primary-glow); }
    .btn-apollo-secondary { background: white; color: #1e293b; border: 1.5px solid #e2e8f0; padding: 14px 28px; border-radius: 18px; font-weight: 700; transition: all 0.2s; }
    .btn-apollo-secondary:hover { background: #f8fafc; border-color: #cbd5e1; }
    .btn-tool { width: 48px; border-radius: 16px; border: 1.5px solid #e2e8f0; background: white; color: var(--text-muted); font-size: 1.2rem; transition: all 0.2s; }

    /* Modal v2 */
    .apollo-modal-root { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
    .apollo-modal-content { background: white; border-radius: 40px; width: 100%; max-width: 650px; overflow: hidden; box-shadow: 0 40px 100px -20px rgba(0,0,0,0.3); }
    .apollo-modal-header { padding: 40px 50px 0; }
    .btn-modal-close { border: none; background: #f1f5f9; width: 44px; height: 44px; border-radius: 50%; color: var(--text-muted); transition: all 0.2s; }
    .btn-modal-close:hover { background: #e2e8f0; color: #0f172a; transform: rotate(90deg); }

    .apollo-input-group label { display: block; font-weight: 800; color: #334155; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px; }
    .input-container { position: relative; }
    .input-container i { position: absolute; left: 18px; top: 18px; color: var(--text-muted); font-size: 1.1rem; }
    .input-container input { width: 100%; border: 1.5px solid #e2e8f0; border-radius: 16px; padding: 16px 20px 16px 52px; font-weight: 600; color: #0f172a; transition: all 0.2s; background: #f8fafc; }
    .input-container input:focus { outline: none; border-color: var(--primary); background: white; box-shadow: 0 0 0 5px rgba(37, 99, 235, 0.08); }

    /* Animations */
    .animate-fade-in { animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
    .animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    .pulse-animation { animation: pulse 2s infinite; }
    @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }

    .empty-icon-wrap { width: 100px; height: 100px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 3rem; color: #cbd5e1; margin: 0 auto; }
  `]
})
export class InventoryDashboardV2Component implements OnInit {
  inventory: Inventory[] = [];
  filteredInventory: Inventory[] = [];
  searchQuery: string = '';
  statusFilter: string = '';

  isModalOpen = false;
  isEditMode = false;
  currentItem: Inventory = this.resetItem();

  constructor(
    private inventoryService: InventoryService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadInventory();
  }

  loadInventory(): void {
    const pharmaId = Number(this.authService.getUserId());
    this.inventoryService.getPharmacistInventory(pharmaId).subscribe({
      next: (data) => {
        this.inventory = data;
        this.filterInventory();
      },
      error: (err) => console.error('Failed to load inventory', err)
    });
  }

  filterInventory(): void {
    let filtered = this.inventory;

    if (this.statusFilter) {
      filtered = filtered.filter(item => item.status === this.statusFilter);
    }

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.drugName.toLowerCase().includes(query) ||
        item.batchNo.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query)
      );
    }

    this.filteredInventory = filtered.sort((a, b) => {
      // Sort by status priority: EXPIRED > LOW_STOCK > ACTIVE
      const priority = { 'EXPIRED': 0, 'LOW_STOCK': 1, 'ACTIVE': 2, 'ARCHIVED': 3 };
      return (priority[a.status] || 99) - (priority[b.status] || 99);
    });
  }

  setStatusFilter(status: string): void {
    this.statusFilter = status;
    this.filterInventory();
  }

  getCountByStatus(status: string): number {
    return this.inventory.filter(item => item.status === status).length;
  }

  getPercent(item: Inventory): number {
    if (item.status === 'EXPIRED') return 100;
    // Calculate progress relative to threshold
    const p = (item.quantity / (item.threshold * 2.5)) * 100;
    return Math.min(Math.max(p, 5), 100);
  }

  exportInventory(): void {
    // Professional CSV Export
    const headers = ['ID', 'Drug Name', 'Batch', 'Expiry Date', 'Quantity', 'Threshold', 'Status'];
    const rows = this.filteredInventory.map(i => [
      i.id, i.drugName, i.batchNo, i.expiryDate, i.quantity, i.threshold, i.status
    ]);

    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\\n" + rows.map(e => e.join(",")).join("\\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MedTrack_Inventory_Report_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  openModal(): void {
    this.isEditMode = false;
    this.currentItem = this.resetItem();
    this.isModalOpen = true;
  }

  editItem(item: Inventory): void {
    this.isEditMode = true;
    this.currentItem = { ...item };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveItem(): void {
    const pharmacistId = Number(this.authService.getUserId());
    const payload = {
      ...this.currentItem,
      pharmacist: { id: pharmacistId }
    };

    if (this.isEditMode && this.currentItem.id) {
      this.inventoryService.update(this.currentItem.id, payload).subscribe({
        next: () => {
          this.loadInventory();
          this.closeModal();
        },
        error: (err) => alert('Operation failed: ' + err.message)
      });
    } else {
      this.inventoryService.add(payload).subscribe({
        next: () => {
          this.loadInventory();
          this.closeModal();
        },
        error: (err) => alert('Operation failed: ' + err.message)
      });
    }
  }

  deleteItem(item: Inventory): void {
    if (item.id && confirm(`Security Protocol: Are you sure you want to ARCHIVE ${item.drugName} (Batch: ${item.batchNo})? This action will be logged in the Audit Vault.`)) {
      this.inventoryService.delete(item.id).subscribe({
        next: () => this.loadInventory(),
        error: (err) => alert('Delete failed: ' + err.message)
      });
    }
  }

  private resetItem(): Inventory {
    return {
      drugName: '',
      batchNo: '',
      expiryDate: '',
      quantity: 0,
      threshold: 15,
      status: 'ACTIVE'
    };
  }
}
