import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrugDetailService, DrugInfo } from '../../services/drug-detail.service';

@Component({
  selector: 'app-medication-detail-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop fade show" *ngIf="isOpen"></div>
    <div class="modal fade show d-block" *ngIf="isOpen" tabindex="-1" role="dialog" aria-hidden="true" (click)="onBackdropClick($event)">
      <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div class="modal-content border-0 glass-modal shadow-lg">
          
          <div class="modal-header border-bottom-0 pb-0 pt-4 px-4 d-flex justify-content-between align-items-start">
             <div>
                <h3 class="modal-title fw-bold text-primary mb-1 d-flex align-items-center">
                    <i class="bi bi-capsule me-2"></i> {{ drugName }}
                </h3>
                <span *ngIf="drugInfo" class="badge rounded-pill bg-light text-dark shadow-sm border px-3 py-2 fw-medium">
                  {{ drugInfo.genericName }}
                </span>
             </div>
             <button type="button" class="btn-close" aria-label="Close" (click)="close()"></button>
          </div>

          <div class="modal-body p-4 position-relative">
            <!-- Loading State -->
            <div *ngIf="loading" class="text-center py-5">
              <div class="spinner-border text-primary speed-slow" role="status">
                <span class="visually-hidden">Loading safety info...</span>
              </div>
              <p class="text-muted mt-3 fw-medium h-auto">Fetching clinical data from global registries...</p>
            </div>

            <!-- Error State -->
            <div *ngIf="error" class="alert alert-danger shadow-sm border-0 d-flex align-items-center">
               <i class="bi bi-exclamation-triangle-fill fs-4 me-3"></i>
               <div>{{ error }}</div>
            </div>

            <!-- Content -->
            <div *ngIf="!loading && drugInfo" class="animation-fade-in">
                
                <!-- Risk Flags (Universal) -->
                <div class="d-flex flex-wrap gap-2 mb-4" *ngIf="drugInfo.contraindicationFlags?.length">
                    <div *ngFor="let flag of drugInfo.contraindicationFlags" 
                         class="risk-flag px-3 py-2 fw-bold rounded shadow-sm d-flex align-items-center"
                         [ngClass]="flag === 'STANDARD SAFETY' ? 'bg-success text-white' : 'bg-danger text-white'">
                        <i class="bi me-2" [ngClass]="flag === 'STANDARD SAFETY' ? 'bi-shield-check' : 'bi-exclamation-octagon-fill'"></i>
                        {{ flag }}
                    </div>
                </div>

                <!-- PATIENT VIEW -->
                <ng-container *ngIf="viewMode === 'patient'">
                    
                    <div class="row g-4">
                        <div class="col-md-7">
                            <h5 class="fw-bold section-title"><i class="bi bi-info-circle me-2 text-info"></i> Why am I taking this?</h5>
                            <p class="text-muted custom-scroll" style="max-height: 100px; overflow-y: auto;">{{ drugInfo.indicationsAndUsage }}</p>
                            
                            <h5 class="fw-bold section-title mt-4"><i class="bi bi-cup-hot me-2 text-warning"></i> Usage & Warnings</h5>
                            <ul class="list-unstyled">
                                <li class="mb-2 text-muted"><i class="bi bi-arrow-right-short text-primary"></i> <strong>How:</strong> {{ drugInfo.dosageAndAdministration | slice:0:150 }}...</li>
                                <li class="mb-2 text-muted"><i class="bi bi-arrow-right-short text-primary"></i> <strong>Watch for:</strong> {{ drugInfo.adverseReactions | slice:0:150 }}...</li>
                            </ul>
                        </div>
                        
                        <!-- Interactive FAQ Sidebar -->
                        <div class="col-md-5">
                            <div class="p-4 rounded-4 shadow-sm" style="background: rgba(30, 58, 138, 0.05); border: 1px solid rgba(30,58,138,0.1);">
                                <h6 class="fw-bold mb-3 d-flex align-items-center">
                                    <i class="bi bi-question-circle-fill text-primary me-2"></i> FAQ
                                </h6>
                                <div class="faq-item">
                                    <small class="fw-bold text-dark d-block mb-1">What if I miss a dose?</small>
                                    <small class="text-muted">{{ drugInfo.patientMedicationInformation | slice:0:120 }}...</small>
                                </div>
                            </div>
                            
                            <div class="mt-4 p-3 rounded-4 bg-white shadow-sm border text-center position-relative overflow-hidden">
                                <div *ngIf="drugInfo.requiresAuthenticityBadge" class="position-absolute top-0 end-0 p-2">
                                    <i class="bi bi-patch-check-fill text-success fs-5" title="Verified Manufacturer"></i>
                                </div>
                                <small class="text-uppercase fw-bold text-muted d-block mb-1" style="font-size: 0.7rem; letter-spacing: 1px;">Manufactured By</small>
                                <span class="fw-bold text-dark">{{ drugInfo.manufacturerName }}</span>
                            </div>
                        </div>
                    </div>

                </ng-container>

                <!-- PHARMACIST VIEW -->
                <ng-container *ngIf="viewMode === 'pharmacist'">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <div class="card bg-light border-0 shadow-sm h-100 p-3">
                                <h6 class="text-muted text-uppercase fw-bold" style="font-size: 0.75rem; letter-spacing: 1px;">Chemical Composition</h6>
                                <div class="fw-bold fs-5 text-dark mt-1">{{ drugInfo.activeIngredient }}</div>
                                <hr class="my-3 text-muted">
                                <small class="text-muted d-block mb-1"><strong>Product Type:</strong> {{ drugInfo.productType }}</small>
                                <small class="text-muted d-block"><strong>Route:</strong> {{ drugInfo.routeOfAdministration }}</small>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card bg-light border-0 shadow-sm h-100 p-3">
                                <h6 class="text-muted text-uppercase fw-bold" style="font-size: 0.75rem; letter-spacing: 1px;">Supply Chain Verification</h6>
                                <small class="text-muted d-block mb-2 mt-1"><strong>RxCUI:</strong> <code class="bg-white px-2 py-1 rounded text-primary">{{ drugInfo.rxcui }}</code></small>
                                <small class="text-muted d-block mb-2"><strong>Manufacturer:</strong> {{ drugInfo.manufacturerName }}</small>
                                <div class="mt-auto">
                                   <!-- Simulated manual batch entry for Pharmacist -->
                                   <label class="form-label text-muted small fw-bold mb-1">Scan Batch Number <span class="text-danger">*</span></label>
                                   <input type="text" class="form-control form-control-sm border-secondary shadow-none" placeholder="e.g. BATCH-99201">
                                </div>
                            </div>
                        </div>
                    </div>
                </ng-container>

            </div>
          </div>
          
          <div class="modal-footer border-top-0 pt-0 pb-4 px-4">
             <button type="button" class="btn btn-secondary px-4 rounded-pill shadow-sm" (click)="close()">Close</button>
             <button *ngIf="viewMode === 'pharmacist' && !loading && drugInfo" type="button" class="btn btn-primary px-4 rounded-pill shadow-sm bg-gradient-primary">Record Verification</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .glass-modal {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(15px);
      border-radius: 20px;
    }
    .text-primary { color: #1e3a8a !important; }
    .bg-gradient-primary { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); border: none; }
    .speed-slow { animation-duration: 2s; }
    .risk-flag { border: 1px solid rgba(0,0,0,0.1); font-size: 0.85rem; }
    .section-title { font-size: 1.1rem; border-bottom: 2px solid #f0f4f8; padding-bottom: 0.5rem; display: inline-block; }
    .custom-scroll::-webkit-scrollbar { width: 6px; }
    .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    .animation-fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class MedicationDetailModalComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Input() drugName: string = '';
  @Input() viewMode: 'patient' | 'pharmacist' = 'patient';
  @Output() closeEvent = new EventEmitter<void>();

  loading: boolean = true;
  error: string | null = null;
  drugInfo: DrugInfo | null = null;

  constructor(private drugService: DrugDetailService) {}

  ngOnInit() {
      if (this.isOpen && this.drugName) {
          this.fetchDetails();
      }
  }

  // To catch changes if modal remains built but data swaps
  ngOnChanges() {
     if (this.isOpen && this.drugName && !this.drugInfo) {
         this.fetchDetails();
     }
  }

  fetchDetails() {
      this.loading = true;
      this.error = null;
      this.drugService.getDrugDetails(this.drugName).subscribe({
          next: (data) => {
              this.drugInfo = data;
              this.loading = false;
          },
          error: (err) => {
              this.error = "Unable to fetch live verification data for this medication.";
              this.loading = false;
          }
      });
  }

  close() {
      this.isOpen = false;
      this.drugInfo = null;
      this.closeEvent.emit();
  }

  onBackdropClick(event: MouseEvent) {
      if ((event.target as HTMLElement).classList.contains('modal')) {
          this.close();
      }
  }
}
