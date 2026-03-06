import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { MedScheduleService, PatientMealPrefs, MedScheduleRequest } from '../../services/med-schedule.service';

interface PrescriptionItem {
    id: number;
    medicineName: string;
    dosage: string;
    mealSlots: string;
    foodInstruction: string;
    durationDays?: number;
    startDate?: string;
    endDate?: string;
}

@Component({
    selector: 'app-medication-schedule-create',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './medication-schedule-create.component.html',
    styleUrls: ['./medication-schedule-create.component.css']
})
export class MedicationScheduleCreateComponent implements OnInit {
    step = 1;
    prescriptionId!: number;
    prescriptionItems: PrescriptionItem[] = [];

    mealPrefs: PatientMealPrefs = {
        breakfastTime: '08:30',
        lunchTime: '13:30',
        dinnerTime: '20:30',
        preMealOffsetMinutes: 15
    };

    loading = false;
    error = '';
    success = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private scheduleService: MedScheduleService
    ) { }

    ngOnInit(): void {
        this.prescriptionId = +this.route.snapshot.queryParams['prescriptionId'];
        this.loadMealPrefs();
        this.loadPrescriptionItems();
    }

    loadMealPrefs(): void {
        this.scheduleService.getMealPrefs().subscribe({
            next: (prefs) => {
                if (prefs && prefs.breakfastTime) {
                    this.mealPrefs = { ...prefs };
                }
            },
            error: () => { } // use defaults on error
        });
    }

    loadPrescriptionItems(): void {
        // Reuse existing prescription detail API
        const token = localStorage.getItem('authToken');
        fetch(`http://localhost:8081/api/prescriptions/${this.prescriptionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(prescription => {
                this.prescriptionItems = prescription.items || [];
            });
    }

    getMealSlotList(item: PrescriptionItem): string[] {
        return item.mealSlots ? item.mealSlots.split(',').map((s: string) => s.trim()) : [];
    }

    getFoodLabel(instruction: string): string {
        return instruction === 'BEFORE_FOOD' ? 'Before Food' :
            instruction === 'AFTER_FOOD' ? 'After Food' :
                instruction === 'WITH_FOOD' ? 'With Food' : 'Any Time';
    }

    getMealIcon(slot: string): string {
        const map: Record<string, string> = {
            BREAKFAST: '🌅', LUNCH: '☀️', DINNER: '🌙', CUSTOM: '💊'
        };
        return map[slot?.toUpperCase()] || '💊';
    }

    nextStep(): void { this.step++; }
    prevStep(): void { this.step--; }

    submit(): void {
        this.loading = true;
        this.error = '';

        const req: MedScheduleRequest = {
            prescriptionId: this.prescriptionId,
            startDate: new Date().toISOString().split('T')[0],
            breakfastTime: this.mealPrefs.breakfastTime,
            lunchTime: this.mealPrefs.lunchTime,
            dinnerTime: this.mealPrefs.dinnerTime,
            preMealOffsetMinutes: this.mealPrefs.preMealOffsetMinutes
        };

        this.scheduleService.createSchedule(req).subscribe({
            next: () => {
                this.success = true;
                this.loading = false;
                setTimeout(() => this.router.navigate(['/schedules']), 1500);
            },
            error: (err) => {
                this.error = err.error || 'Failed to create schedule. Please try again.';
                this.loading = false;
            }
        });
    }
}
