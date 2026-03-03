import { Component } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router'; // Added Router, NavigationEnd
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar.component';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'frontend';
  showNavbar = true;

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const hiddenRoutes = ['/login', '/signup', '/landing', '/register', '/doctor-dashboard'];
      // Check if current url is in hiddenRoutes (exact match or starts with)
      // Actually strictly hiding on login/register/landing
      const url = event.urlAfterRedirects;
      this.showNavbar = !hiddenRoutes.some(route => url.includes(route));
    });
  }
}
