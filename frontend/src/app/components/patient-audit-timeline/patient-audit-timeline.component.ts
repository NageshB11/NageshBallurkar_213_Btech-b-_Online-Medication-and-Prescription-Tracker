import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../services/admin.service';

@Component({
    selector: 'app-patient-audit-timeline',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './patient-audit-timeline.component.html',
    styleUrls: ['./patient-audit-timeline.component.css']
})
export class PatientAuditTimelineComponent implements OnInit {
    patients: any[] = [];
    selectedPatientId: number | null = null;
    selectedPatient: any = null;

    prescriptionGroups: any[] = [];   // Array of PatientAuditDTO
    isLoadingPatients = false;
    isLoadingTimeline = false;
    error: string | null = null;

    // Track expanded prescription groups
    expandedGroups: Set<number> = new Set();

    constructor(private adminService: AdminService) { }

    ngOnInit() {
        this.loadPatients();
    }

    loadPatients() {
        this.isLoadingPatients = true;
        this.adminService.getAllPatients().subscribe({
            next: (data) => {
                this.patients = data;
                this.isLoadingPatients = false;
            },
            error: (err) => {
                console.error('Failed to load patients', err);
                this.isLoadingPatients = false;
            }
        });
    }

    onPatientSelect(event: Event) {
        const id = +(event.target as HTMLSelectElement).value;
        if (!id) {
            this.selectedPatientId = null;
            this.selectedPatient = null;
            this.prescriptionGroups = [];
            return;
        }
        this.selectedPatientId = id;
        this.selectedPatient = this.patients.find(p => p.id === id);
        this.loadTimeline(id);
    }

    loadTimeline(patientId: number) {
        this.isLoadingTimeline = true;
        this.error = null;
        this.prescriptionGroups = [];
        this.expandedGroups.clear();

        this.adminService.getPatientAuditTimeline(patientId).subscribe({
            next: (data) => {
                this.prescriptionGroups = data;
                // Auto-expand all groups
                data.forEach((g: any) => this.expandedGroups.add(g.prescriptionId));
                this.isLoadingTimeline = false;
                if (!data || data.length === 0) {
                    this.error = `No audit history found for this patient.`;
                }
            },
            error: (err) => {
                this.isLoadingTimeline = false;
                this.error = 'Failed to load patient audit timeline.';
                console.error(err);
            }
        });
    }

    toggleGroup(prescriptionId: number) {
        if (this.expandedGroups.has(prescriptionId)) {
            this.expandedGroups.delete(prescriptionId);
        } else {
            this.expandedGroups.add(prescriptionId);
        }
    }

    isExpanded(prescriptionId: number): boolean {
        return this.expandedGroups.has(prescriptionId);
    }

    getCardAccent(actionType: string): string {
        if (!actionType) return '#4f8ef7';
        switch (actionType.toUpperCase()) {
            case 'DISPENSED': return '#22c55e';
            case 'RENEWED': return '#a855f7';
            default: return '#4f8ef7';
        }
    }

    getCardGlow(actionType: string): string {
        switch ((actionType || '').toUpperCase()) {
            case 'DISPENSED': return 'rgba(34, 197, 94, 0.12)';
            case 'RENEWED': return 'rgba(168, 85, 247, 0.12)';
            default: return 'rgba(79, 142, 247, 0.12)';
        }
    }

    getBadgeClass(actionType: string): string {
        switch ((actionType || '').toUpperCase()) {
            case 'DISPENSED': return 'badge-success';
            case 'RENEWED': return 'badge-purple';
            default: return 'badge-apollo';
        }
    }

    totalVersions(): number {
        return this.prescriptionGroups.reduce((sum, g) => sum + (g.versions?.length || 0), 0);
    }
}
