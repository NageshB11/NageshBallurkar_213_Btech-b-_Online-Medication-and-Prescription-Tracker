import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PrescriptionService } from '../../services/prescription.service';
import { Prescription } from '../../models/prescription.model';

@Component({
    selector: 'app-prescription-list',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule],
    templateUrl: './prescription-list.component.html',
    styleUrl: './prescription-list.component.css'
})
export class PrescriptionListComponent implements OnInit {
    prescriptions: Prescription[] = [];
    filteredPrescriptions: Prescription[] = [];
    searchTerm: string = '';
    statusFilter: string = 'ALL';
    loading = true;

    constructor(private prescriptionService: PrescriptionService) { }

    ngOnInit(): void {
        this.loadPrescriptions();
    }

    loadPrescriptions(): void {
        this.loading = true;
        this.prescriptionService.getMyPrescriptions().subscribe({
            next: (data) => {
                this.prescriptions = data;
                this.filterPrescriptions();
                this.loading = false;
            },
            error: (err: any) => {
                console.error('Error fetching prescriptions', err);
                this.loading = false;
            }
        });
    }

    filterPrescriptions(): void {
        this.filteredPrescriptions = this.prescriptions.filter(p => {
            const medicineName = p.items?.[0]?.medicineName?.toLowerCase() || '';
            const doctorName = p.doctor?.fullName?.toLowerCase() || '';
            const search = this.searchTerm.toLowerCase();

            const matchesSearch = medicineName.includes(search) || doctorName.includes(search);
            const matchesStatus = this.statusFilter === 'ALL' || p.status === this.statusFilter;
            return matchesSearch && matchesStatus;
        });
    }
}
