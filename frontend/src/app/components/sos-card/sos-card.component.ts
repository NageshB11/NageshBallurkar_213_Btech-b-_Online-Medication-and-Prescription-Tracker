import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sos-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="apollo-card sos-card p-0 overflow-hidden h-100 position-relative">
      <div class="bg-danger text-white p-3 d-flex justify-content-between align-items-center">
         <h5 class="m-0 fw-bold"><i class="bi bi-exclamation-triangle-fill me-2"></i>Emergency ID</h5>
         <i class="bi bi-wifi-off opacity-50"></i>
      </div>
      <div class="p-4 text-center">
         <h5 class="fw-bold mb-1">{{userName}}</h5>
         <p class="text-danger fw-bold small mb-2">Blood Type: O+ (Demo)</p>
         <p class="text-muted small mb-0">Scan for medical history & emergency contacts.</p>
      </div>
      <div class="card-footer bg-light p-3 text-center border-0">
          <small class="text-muted">ID: {{userId}}</small>
      </div>
    </div>
  `,
  styles: [`
    .apollo-card {
        border-radius: 20px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        border: none;
    }
    .sos-card {
        background: white;
        transition: transform 0.2s;
    }
    .sos-card:hover {
        transform: translateY(-5px);
    }
  `]
})
export class SosCardComponent implements OnInit {
  @Input() userId: number | null = null;
  @Input() userName: string = 'Unknown';

  constructor() { }

  ngOnInit(): void { }
}
