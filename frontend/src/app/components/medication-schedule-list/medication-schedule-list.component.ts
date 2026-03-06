import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MedScheduleService, MedicationSchedule } from '../../services/med-schedule.service';

@Component({
    selector: 'app-medication-schedule-list',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './medication-schedule-list.component.html',
    styleUrls: ['./medication-schedule-list.component.css']
})
export class MedicationScheduleListComponent implements OnInit {
    schedules: MedicationSchedule[] = [];
    loading = true;
    error = '';

    constructor(private scheduleService: MedScheduleService) { }

    ngOnInit(): void {
        this.scheduleService.getMySchedules().subscribe({
            next: (data) => { this.schedules = data; this.loading = false; },
            error: () => { this.error = 'Failed to load schedules.'; this.loading = false; }
        });
    }

    pause(id: number): void {
        this.scheduleService.updateStatus(id, 'PAUSED').subscribe({
            next: (updated) => {
                const idx = this.schedules.findIndex(s => s.id === id);
                if (idx !== -1) this.schedules[idx] = updated;
            }
        });
    }

    resume(id: number): void {
        this.scheduleService.updateStatus(id, 'ACTIVE').subscribe({
            next: (updated) => {
                const idx = this.schedules.findIndex(s => s.id === id);
                if (idx !== -1) this.schedules[idx] = updated;
            }
        });
    }

    statusClass(status: string): string {
        return {
            ACTIVE: 'badge-active', PAUSED: 'badge-paused',
            COMPLETED: 'badge-completed', CANCELLED: 'badge-cancelled'
        }[status] || '';
    }
}
