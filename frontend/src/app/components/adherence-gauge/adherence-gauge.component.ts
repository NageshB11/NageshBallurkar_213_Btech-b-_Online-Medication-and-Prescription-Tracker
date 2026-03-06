import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-adherence-gauge',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="gauge-wrap">
      <svg [attr.width]="size" [attr.height]="size" [attr.viewBox]="'0 0 ' + size + ' ' + size">
        <!-- Background circle -->
        <circle
          class="gauge-bg"
          [attr.cx]="center"
          [attr.cy]="center"
          [attr.r]="radius"
          fill="none"
          stroke-width="14"
        />
        <!-- Progress arc -->
        <circle
          class="gauge-progress"
          [attr.cx]="center"
          [attr.cy]="center"
          [attr.r]="radius"
          fill="none"
          stroke-width="14"
          stroke-linecap="round"
          [attr.stroke]="arcColor"
          [attr.stroke-dasharray]="circumference"
          [attr.stroke-dashoffset]="dashOffset"
          transform="rotate(-90 {{center}} {{center}})"
        />
        <!-- Center text -->
        <text [attr.x]="center" [attr.y]="center - 8" class="gauge-pct" text-anchor="middle" dominant-baseline="middle">
          {{ percent | number:'1.0-0' }}%
        </text>
        <text [attr.x]="center" [attr.y]="center + 14" class="gauge-label" text-anchor="middle">
          Adherence
        </text>
      </svg>
      <div class="gauge-status" [style.color]="arcColor">{{ statusLabel }}</div>
    </div>
  `,
    styles: [`
    .gauge-wrap { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
    .gauge-bg { stroke: rgba(255,255,255,0.06); }
    .gauge-progress { transition: stroke-dashoffset 0.9s ease, stroke 0.4s ease; }
    .gauge-pct { fill: #e2e8f0; font-size: 22px; font-weight: 800; font-family: 'Inter', sans-serif; }
    .gauge-label { fill: #64748b; font-size: 11px; font-family: 'Inter', sans-serif; }
    .gauge-status { font-size: 0.78rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
  `]
})
export class AdherenceGaugeComponent implements OnChanges {
    @Input() percent: number = 0;
    @Input() size: number = 140;

    center = 70;
    radius = 56;
    circumference = 2 * Math.PI * 56;
    dashOffset = 0;
    arcColor = '#22c55e';
    statusLabel = 'Good';

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['size'] && this.size !== 140) {
            this.center = this.size / 2;
            this.radius = this.size / 2 - 14;
            this.circumference = 2 * Math.PI * this.radius;
        }
        const clampedPct = Math.max(0, Math.min(100, this.percent));
        this.dashOffset = this.circumference * (1 - clampedPct / 100);

        if (clampedPct >= 80) {
            this.arcColor = '#22c55e'; this.statusLabel = 'Good';
        } else if (clampedPct >= 50) {
            this.arcColor = '#f59e0b'; this.statusLabel = 'Fair';
        } else {
            this.arcColor = '#ef4444'; this.statusLabel = 'Poor';
        }
    }
}
