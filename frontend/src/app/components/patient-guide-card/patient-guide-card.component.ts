import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { ExternalDrugService, DrugProfile } from '../../services/external-drug.service';

@Component({
  selector: 'app-patient-guide-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-guide-card.component.html',
  styleUrls: ['./patient-guide-card.component.css'],
  animations: [
    trigger('horizontalSlide', [
      state('collapsed', style({
        width: '0px',
        opacity: 0,
        overflow: 'hidden',
        whiteSpace: 'nowrap'
      })),
      state('expanded', style({
        width: '100%',
        opacity: 1
      })),
      transition('collapsed <=> expanded', [
        animate('500ms cubic-bezier(0.165, 0.84, 0.44, 1)')
      ])
    ])
  ]
})
export class PatientGuideCardComponent implements OnInit {
  @Input() medicineName: string = '';
  @Input() batchId: string = '';

  drugProfile: DrugProfile | null = null;
  isExpanded: boolean = false;
  isLoading: boolean = true;

  constructor(private drugService: ExternalDrugService) { }

  ngOnInit(): void {
    if (this.medicineName) {
      this.drugService.getDrugProfile(this.medicineName).subscribe({
        next: (profile) => {
          // DIAGNOSTIC LOG: Trace frontend data reception
          console.log(`[SUBSCRIPTION] Received Profile for ${this.medicineName}:`, profile);
          this.drugProfile = profile;
          this.isLoading = false;
        },
        error: (err) => {
          console.error(`[SUBSCRIPTION ERROR] for ${this.medicineName}:`, err);
          this.isLoading = false;
        }
      });
    }
  }

  toggleExpand(): void {
    this.isExpanded = !this.isExpanded;
  }
}
