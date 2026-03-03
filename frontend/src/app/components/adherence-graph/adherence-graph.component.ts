import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdherenceService } from '../../services/adherence.service';
import { Prescription } from '../../models/prescription.model';
@Component({
  selector: 'app-adherence-graph',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="adherence-card">
      <h3>Adherence Tracker</h3>
      <div class="svg-container">
        <svg viewBox="0 0 100 100">
          <!-- Background Circle -->
          <circle class="bg" cx="50" cy="50" r="45"></circle>
          <!-- Progress Circle -->
          <circle class="progress" cx="50" cy="50" r="45"
            [style.strokeDasharray]="strokeDasharray"
            [style.strokeDashoffset]="strokeDashoffset">
          </circle>
          <text x="50" y="55" class="percentage">{{ percentage }}%</text>
        </svg>
      </div>
      <p class="stats">{{ completedDoses }} / {{ totalDoses }} expected doses taken</p>
    </div>
  `,
  styles: [`
    .adherence-card {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 20px;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
    }
    .svg-container {
      width: 150px;
      height: 150px;
      margin: 0 auto;
    }
    svg {
      transform: rotate(-90deg);
    }
    circle {
      fill: none;
      stroke-width: 8;
      stroke-linecap: round;
    }
    circle.bg {
      stroke: #e2e8f0;
    }
    circle.progress {
      stroke: var(--pharmacist-success);
      transition: stroke-dashoffset 1s ease-out;
    }
    .percentage {
      fill: var(--text-primary);
      font-size: 18px;
      font-weight: 700;
      text-anchor: middle;
      transform: rotate(90deg);
      transform-origin: center;
    }
    .stats {
      margin-top: 15px;
      font-size: 0.9rem;
      color: var(--text-secondary);
      font-weight: 500;
    }
  `]
})
export class AdherenceGraphComponent implements OnInit {
  @Input() prescriptionId!: number;
  @Input() prescription!: Prescription;
  completedDoses = 0;
  totalDoses = 0;
  percentage = 0;
  strokeDasharray = 282.7; // 2 * PI * r (r=45)
  strokeDashoffset = 282.7;
  constructor(private adherenceService: AdherenceService) { }
  ngOnInit(): void {
    this.calculateTotalDoses();
    this.fetchAdherence();
  }
  calculateTotalDoses(): void {
    let total = 0;
    if (this.prescription?.items) {
      this.prescription.items.forEach(item => {
        if (item.startDate && item.endDate) {
          const today = new Date();
          const start = new Date(item.startDate);
          start.setHours(0, 0, 0, 0);

          const end = new Date(item.endDate);
          end.setHours(23, 59, 59, 999);

          const effectiveToday = today < end ? today : end;

          let daysElapsed = Math.floor((effectiveToday.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

          if (today > end) {
            daysElapsed = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          }

          if (daysElapsed < 0) daysElapsed = 0;

          const timings = item.dosageTiming ? item.dosageTiming.split(',') : ['Daily'];
          total += daysElapsed * timings.length;
        }
      });
    }
    this.totalDoses = total;
  }
  fetchAdherence(): void {
    this.adherenceService.getPatientLogs(this.prescription.patient?.id || 0).subscribe(logs => {
      // Filter logs for this specific prescription
      const relevantLogs = logs.filter(log => log.prescription?.id === this.prescriptionId);
      this.completedDoses = relevantLogs.length;
      this.updateGraph();
    });
  }
  updateGraph(): void {
    if (this.totalDoses === 0) {
      this.percentage = 100;
    } else {
      this.percentage = Math.min(100, Math.round((this.completedDoses / this.totalDoses) * 100));
    }
    const offset = this.strokeDasharray - (this.percentage / 100) * this.strokeDasharray;
    this.strokeDashoffset = offset;
  }
}
