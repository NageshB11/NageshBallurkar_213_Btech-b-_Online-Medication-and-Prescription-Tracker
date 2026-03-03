import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../services/admin.service';

@Component({
    selector: 'app-audit-trace',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './audit-trace.component.html',
    styleUrls: ['./audit-trace.component.css']
})
export class AuditTraceComponent {
    searchId: string = '';
    auditRecords: any[] = [];
    isLoading = false;
    error: string | null = null;
    tracedId: number | null = null;

    constructor(private adminService: AdminService) { }

    trace() {
        const id = +this.searchId;
        if (!id || isNaN(id)) {
            this.error = 'Please enter a valid numeric Prescription ID.';
            return;
        }
        this.isLoading = true;
        this.error = null;
        this.auditRecords = [];
        this.tracedId = id;

        this.adminService.getPrescriptionTrace(id).subscribe({
            next: (data) => {
                this.auditRecords = data;
                this.isLoading = false;
                if (!data || data.length === 0) {
                    this.error = `No audit records found for Prescription #${id}.`;
                }
            },
            error: (err) => {
                this.isLoading = false;
                this.error = `Failed to fetch trace for Prescription #${id}. Please check the ID and try again.`;
                console.error(err);
            }
        });
    }

    getCardAccent(actionType: string): string {
        if (!actionType) return '#4f8ef7';
        switch (actionType.toUpperCase()) {
            case 'DISPENSED': return '#22c55e';
            case 'RENEWED': return '#a855f7';
            default: return '#4f8ef7'; // Apollo Blue for ISSUED and all others
        }
    }

    getCardGlow(actionType: string): string {
        if (!actionType) return 'rgba(79, 142, 247, 0.15)';
        switch (actionType.toUpperCase()) {
            case 'DISPENSED': return 'rgba(34, 197, 94, 0.15)';
            case 'RENEWED': return 'rgba(168, 85, 247, 0.15)';
            default: return 'rgba(79, 142, 247, 0.15)';
        }
    }

    getBadgeClass(actionType: string): string {
        if (!actionType) return 'badge-apollo';
        switch (actionType.toUpperCase()) {
            case 'DISPENSED': return 'badge-success';
            case 'RENEWED': return 'badge-purple';
            default: return 'badge-apollo';
        }
    }

    formatTimestamp(ts: string): string {
        if (!ts) return 'N/A';
        const d = new Date(ts);
        return d.toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }
}
