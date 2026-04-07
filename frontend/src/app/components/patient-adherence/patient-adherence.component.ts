import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdherenceService } from '../../services/adherence.service';
import { FilterTakenPipe } from '../../pipes/filter-taken.pipe';

@Component({
  selector: 'app-patient-adherence',
  standalone: true,
  imports: [CommonModule, FilterTakenPipe],
  templateUrl: './patient-adherence.component.html',
  styleUrls: ['./patient-adherence.component.css']
})
export class PatientAdherenceComponent implements OnInit {
  @Input() prescriptionId!: number;
  
  adherenceData: any = null;
  dates: any[] = [];
  loading = true;
  expandedDate: string | null = null;

  constructor(private adherenceService: AdherenceService) {}

  ngOnInit(): void {
    if (this.prescriptionId) {
      this.loadAdherence();
    }
  }

  loadAdherence(): void {
    this.loading = true;
    this.adherenceService.getPrescriptionAdherence(this.prescriptionId).subscribe({
      next: (data) => {
        this.adherenceData = data;
        this.processLogs(data.logs);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading adherence', err);
        this.loading = false;
      }
    });
  }

  processLogs(logs: any[]): void {
    const groupedByDate: any = {};
    
    logs.forEach(log => {
      // Normalize backend property names
      log.taken = log.taken || log.isTaken || log.status === 'TAKEN';

      // Fix Jackson LocalDate array serialization
      let dateKey = log.date;
      if (Array.isArray(log.date) && log.date.length >= 3) {
          const month = log.date[1].toString().padStart(2, '0');
          const day = log.date[2].toString().padStart(2, '0');
          dateKey = `${log.date[0]}-${month}-${day}`;
          log.date = dateKey; 
      }
      
      if (!groupedByDate[log.date]) {
        groupedByDate[log.date] = {
          date: log.date,
          meals: [],
          allTaken: false
        };
      }
      groupedByDate[log.date].meals.push(log);
    });

    this.dates = Object.values(groupedByDate).map((day: any) => {
      day.allTaken = day.meals.every((m: any) => m.taken);
      return day;
    });

    // Auto-expand today if available
    const today = new Date().toISOString().split('T')[0];
    if (groupedByDate[today]) {
      this.expandedDate = today;
    }
  }

  toggleDay(date: string): void {
    this.expandedDate = this.expandedDate === date ? null : date;
  }

  onTakeDose(event: Event, meal: any, day: any): void {
    event.stopPropagation(); // purely navigation/interaction
    
    // Future Date Guard
    const todayStr = new Date().toISOString().split('T')[0];
    if (day.date > todayStr) {
      alert("⚠️ Future-Date Restriction: You cannot log adherence for a future date.");
      return;
    }

    // Strict one-time click quota guard
    if (meal.taken) {
      console.warn("Slot already logged");
      return;
    }
    
    this.adherenceService.takeDose(meal.id, true).subscribe({
      next: (updatedMeal) => {
        meal.taken = true;
        meal.takenAt = updatedMeal.takenAt;
        
        console.log(`Dose Logged Successfully for ${meal.mealSlot}!`);
      },
      error: (err) => console.error('Failed to update dose log', err)
    });
  }


  isDayComplete(day: any): boolean {
    if (!day || !day.meals || day.meals.length === 0) return false;
    return day.meals.every((m: any) => m.taken);
  }

  isExpandable(day: any): boolean {
    // Logic to expand the current day or allow manual expand
    return true; 
  }
}
