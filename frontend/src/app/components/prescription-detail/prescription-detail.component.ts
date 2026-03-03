import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PrescriptionService } from '../../services/prescription.service';
import { PharmacistService } from '../../services/pharmacist.service';
import { Prescription } from '../../models/prescription.model';
import { AuthService } from '../../services/auth.service';
import { AdherenceGraphComponent } from '../adherence-graph/adherence-graph.component';

@Component({
    selector: 'app-prescription-detail',
    standalone: true,
    imports: [CommonModule, RouterModule, AdherenceGraphComponent],
    templateUrl: './prescription-detail.component.html',
    styleUrl: './prescription-detail.component.css',
})
export class PrescriptionDetailComponent implements OnInit {
    prescription: Prescription | null = null;
    loading = true;
    auditHistory: any[] = [];
    showAudit = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private prescriptionService: PrescriptionService,
        private pharmacistService: PharmacistService,
        private authService: AuthService
    ) { }

    ngOnInit(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (id) {
            this.loadPrescription(id);
            this.loadAudit(id);
        }
    }

    get isDoctor(): boolean {
        return this.authService.getRole() === 'DOCTOR';
    }
    get isPharmacist(): boolean {
        return this.authService.getRole() === 'PHARMACIST';
    }
    loadPrescription(id: number): void {
        const service = this.isPharmacist ? this.pharmacistService : this.prescriptionService;
        service.getPrescription(id).subscribe({
            next: (data) => {
                this.prescription = data;
                this.loading = false;
            },
            error: (err: any) => {
                console.error('Error loading prescription', err);
                this.loading = false;
            }
        });
    }

    loadAudit(id: number): void {
        this.prescriptionService.getAuditHistory(id).subscribe({
            next: (data) => this.auditHistory = data,
            error: (err) => console.error('Error loading audit', err)
        });
    }

    downloadPdf(): void {
        if (!this.prescription?.id) return;
        this.prescriptionService.downloadPrescription(this.prescription.id!).subscribe({
            next: (blob) => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Prescription-${this.prescription?.id}.pdf`;
                link.click();
                window.URL.revokeObjectURL(url);
            },
            error: (err) => console.error('Download failed', err)
        });
    }

    renewPrescription(): void {
        if (this.prescription?.id) {
            this.router.navigate(['/prescription'], { queryParams: { cloneId: this.prescription.id } });
        }
    }

    dispensePrescription(): void {
        if (!this.prescription?.id) return;
        this.pharmacistService.dispensePrescription(this.prescription.id).subscribe({
            next: (data) => {
                this.prescription = data;
                alert('Prescription dispensed successfully!');
                this.loadAudit(this.prescription.id!);
            },
            error: (err) => alert('Dispensing failed: ' + err.message)
        });
    }

    requestClarification(): void {
        if (!this.prescription?.id) return;
        const reason = prompt('Please enter the reason for clarification:');
        if (reason) {
            this.pharmacistService.requestClarification(this.prescription.id, reason).subscribe({
                next: () => alert('Clarification request sent to doctor'),
                error: (err) => alert('Failed to send request: ' + err.message)
            });
        }
    }

    requestRenewal(): void {
        alert('Renewal request sent to doctor!');
        // Implement actual API call if backend supports it
    }
}
