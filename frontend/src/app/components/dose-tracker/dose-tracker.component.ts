import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DoseLogService, DoseLog } from '../../services/dose-log.service';

interface MealGroup {
    slot: string;
    icon: string;
    label: string;
    time: string;
    doses: DoseLog[];
}

@Component({
    selector: 'app-dose-tracker',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './dose-tracker.component.html',
    styleUrls: ['./dose-tracker.component.css']
})
export class DoseTrackerComponent implements OnInit {
    mealGroups: MealGroup[] = [];
    loading = true;
    error = '';
    noteInput: Record<number, string> = {};
    today = new Date();

    constructor(private doseLogService: DoseLogService) { }

    ngOnInit(): void {
        this.loadTodaysDoses();
    }

    loadTodaysDoses(): void {
        this.loading = true;
        this.doseLogService.getTodaysDoses().subscribe({
            next: (doses) => {
                this.mealGroups = this.groupByMealSlot(doses);
                this.loading = false;
            },
            error: () => { this.error = 'Failed to load today\'s doses.'; this.loading = false; }
        });
    }

    groupByMealSlot(doses: DoseLog[]): MealGroup[] {
        const slotOrder = ['BREAKFAST', 'LUNCH', 'DINNER', 'CUSTOM'];
        const grouped: Record<string, DoseLog[]> = {};

        for (const dose of doses) {
            const slot = dose.mealSlot || 'CUSTOM';
            if (!grouped[slot]) grouped[slot] = [];
            grouped[slot].push(dose);
        }

        return slotOrder
            .filter(slot => grouped[slot]?.length > 0)
            .map(slot => {
                const first = grouped[slot][0];
                return {
                    slot,
                    icon: first.mealSlotIcon,
                    label: this.slotLabel(slot, first.foodInstruction),
                    time: first.scheduledTime
                        ? new Date(first.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '',
                    doses: grouped[slot]
                };
            });
    }

    slotLabel(slot: string, foodInstruction: string): string {
        const prep = foodInstruction === 'BEFORE_FOOD' ? 'Before ' : 'After ';
        const meal = { BREAKFAST: 'Breakfast', LUNCH: 'Lunch', DINNER: 'Dinner', CUSTOM: 'Custom' }[slot] || slot;
        return prep + meal;
    }

    mark(dose: DoseLog, status: string): void {
        const notes = this.noteInput[dose.doseId] || undefined;
        this.doseLogService.markDose(dose.doseId, status, notes).subscribe({
            next: (updated) => {
                dose.status = updated.status;
                dose.actualTime = updated.actualTime;
                delete this.noteInput[dose.doseId];
            },
            error: () => alert('Failed to update dose status.')
        });
    }

    snooze(dose: DoseLog): void {
        this.doseLogService.snoozeDose(dose.doseId).subscribe({
            next: (updated) => {
                dose.status = updated.status;
                dose.snoozedUntil = updated.snoozedUntil;
                dose.snoozeCount = updated.snoozeCount;
            },
            error: () => alert('Failed to snooze dose.')
        });
    }

    statusClass(status: string): string {
        return {
            TAKEN: 'status-taken', PENDING: 'status-pending',
            MISSED: 'status-missed', SKIPPED: 'status-skipped',
            SNOOZED: 'status-snoozed'
        }[status] || '';
    }

    canMark(dose: DoseLog): boolean {
        return dose.status === 'PENDING' || dose.status === 'SNOOZED';
    }
}
