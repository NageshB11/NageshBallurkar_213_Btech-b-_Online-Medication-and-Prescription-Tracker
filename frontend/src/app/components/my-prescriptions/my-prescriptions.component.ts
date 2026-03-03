import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // Added RouterModule
import { PrescriptionService } from '../../services/prescription.service';
import { AuthService } from '../../services/auth.service'; // Added AuthService
import { Prescription } from '../../models/prescription.model';

@Component({
    selector: 'app-my-prescriptions',
    standalone: true,
    imports: [CommonModule, RouterModule], // Added RouterModule
    templateUrl: './my-prescriptions.component.html',
    styleUrls: ['./my-prescriptions.component.css']
})
export class MyPrescriptionsComponent implements OnInit {
    prescriptions: Prescription[] = [];
    selectedHistory: any[] | null = null;

    constructor(
        private prescriptionService: PrescriptionService,
        private authService: AuthService // Injected AuthService
    ) { }

    ngOnInit(): void {
        this.loadPrescriptions();
    }

    loadPrescriptions(): void {
        this.prescriptionService.getMyPrescriptions().subscribe({
            next: (data) => this.prescriptions = data,
            error: (err: any) => console.error('Failed to load history', err)
        });
    }

    downloadPdf(id: number | undefined): void {
        if (!id) return;
        this.prescriptionService.downloadPrescription(id).subscribe({
            next: (data: Blob) => {
                const url = window.URL.createObjectURL(data);
                const link = document.createElement('a');
                link.href = url;
                link.download = `prescription-${id}.pdf`;
                link.click();
                window.URL.revokeObjectURL(url);
            },
            error: (err) => console.error('Failed to download PDF', err)
        });
    }

    viewHistory(id: number): void {
        this.prescriptionService.getAuditHistory(id).subscribe({
            next: (data) => this.selectedHistory = data,
            error: (err) => console.error('Failed to load history', err)
        });
    }

    closeHistory(): void {
        this.selectedHistory = null;
    }

    logout(): void {
        this.authService.logout();
    }
}
