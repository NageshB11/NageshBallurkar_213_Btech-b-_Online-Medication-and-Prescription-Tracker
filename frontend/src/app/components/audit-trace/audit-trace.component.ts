import { Component, OnInit } from '@angular/core';
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
export class AuditTraceComponent implements OnInit {
    searchId: string = '';
    users: any[] = [];
    filteredUsers: any[] = [];
    selectedUser: any = null;
    auditRecords: any[] = [];
    isLoading = false;
    error: string | null = null;
    tracedId: number | null = null;
    doctorSearchId: string = '';

    get doctors() {
        return this.users
            .filter(u => u.role?.toUpperCase() === 'DOCTOR')
            .sort((a, b) => (a.fullName || a.email || '').localeCompare(b.fullName || b.email || ''));
    }

    get patients() {
        return this.users
            .filter(u => u.role?.toUpperCase() === 'PATIENT')
            .sort((a, b) => (a.fullName || a.email || '').localeCompare(b.fullName || b.email || ''));
    }

    get pharmacists() {
        return this.users
            .filter(u => u.role?.toUpperCase() === 'PHARMACIST')
            .sort((a, b) => (a.fullName || a.email || '').localeCompare(b.fullName || b.email || ''));
    }

    constructor(private adminService: AdminService) { }

    ngOnInit() {
        // Force reset any global dimming or filters
        document.body.style.filter = 'none';
        document.body.style.background = 'white';
        this.loadUsers();
    }

    loadUsers() {
        this.adminService.getAllUsers().subscribe({
            next: (data) => {
                // Filter out Admin for the audit trace view
                this.users = data.filter(u => u.role !== 'ADMIN');
                this.filteredUsers = [...this.users];
            },
            error: (err) => console.error('Failed to load users', err)
        });
    }

    filterUsers(term: string) {
        if (!term) {
            this.filteredUsers = [...this.users];
            return;
        }
        const t = term.toLowerCase();
        this.filteredUsers = this.users.filter(u => 
            u.fullName?.toLowerCase().includes(t) || 
            u.email?.toLowerCase().includes(t) ||
            u.role?.toLowerCase().includes(t)
        );
    }

    selectUser(user: any) {
        this.selectedUser = user;
        this.searchId = user.email; // Show ID/Email for clarity as requested
        this.auditRecords = []; // Clear previous results immediately
        this.error = null;
        this.trace(user.id);
    }

    trace(userId?: number) {
        const id = userId || (this.selectedUser ? this.selectedUser.id : null);
        if (!id) {
            this.error = 'Please select a user to trace.';
            return;
        }
        this.isLoading = true;
        this.error = null;
        this.auditRecords = [];
        this.tracedId = id;

        this.adminService.getUserAuditTrace(id).subscribe({
            next: (data: any) => {
                this.selectedUser = data.user;
                this.auditRecords = data.timeline;
                this.isLoading = false;
                if (!this.auditRecords || this.auditRecords.length === 0) {
                    this.error = `No audit records found for ${this.selectedUser.fullName}.`;
                }
            },
            error: (err: any) => {
                this.isLoading = false;
                this.error = `Failed to fetch trace for user. Please try again.`;
                console.error(err);
            }
        });
    }

    exportReport() {
        if (!this.selectedUser) return;
        this.isLoading = true;
        this.adminService.exportOfficialAudit('PDF', '2020-01-01', new Date().toISOString().split('T')[0]).subscribe({
            next: (blob: Blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Audit_Report_${this.selectedUser.fullName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
                a.click();
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Export failed', err);
                this.isLoading = false;
            }
        });
    }

    formatTimestamp(ts: any): string {
        if (!ts) return 'N/A';
        return new Date(ts).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }
}
