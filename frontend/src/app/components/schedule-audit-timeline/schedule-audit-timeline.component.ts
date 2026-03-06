import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MedScheduleService, ScheduleAudit } from '../../services/med-schedule.service';

@Component({
    selector: 'app-schedule-audit-timeline',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './schedule-audit-timeline.component.html',
    styleUrls: ['./schedule-audit-timeline.component.css']
})
export class ScheduleAuditTimelineComponent implements OnInit {
    auditEntries: ScheduleAudit[] = [];
    scheduleId!: number;
    loading = true;
    error = '';

    changeTypeIcons: Record<string, string> = {
        CREATED: '✨', MODIFIED: '✏️', PAUSED: '⏸️',
        RESUMED: '▶️', CANCELLED: '❌'
    };

    changeTypeColors: Record<string, string> = {
        CREATED: '#22c55e', MODIFIED: '#3b82f6', PAUSED: '#f59e0b',
        RESUMED: '#8b5cf6', CANCELLED: '#ef4444'
    };

    constructor(private route: ActivatedRoute, private scheduleService: MedScheduleService) { }

    ngOnInit(): void {
        this.scheduleId = +this.route.snapshot.params['id'];
        this.scheduleService.getScheduleAudit(this.scheduleId).subscribe({
            next: (data) => { this.auditEntries = data; this.loading = false; },
            error: () => { this.error = 'Failed to load audit trail.'; this.loading = false; }
        });
    }

    formatDate(dt: string): string {
        return new Date(dt).toLocaleString();
    }
}
