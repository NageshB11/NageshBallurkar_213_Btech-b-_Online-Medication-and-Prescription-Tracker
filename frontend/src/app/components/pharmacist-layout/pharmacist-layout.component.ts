import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-pharmacist-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="workspace-root animate-fade-in">
      <main class="main-workspace container-fluid py-4">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .workspace-root {
      min-height: calc(100vh - 70px); /* Adjust for navbar height */
      background: #f8fafc;
      font-family: 'Inter', sans-serif;
    }

    .main-workspace {
      width: 100%;
      max-width: 1600px;
      margin: 0 auto;
    }

    .animate-fade-in {
      animation: fadeIn 0.5s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class PharmacistLayoutComponent {}
