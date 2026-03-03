import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      role: ['PATIENT', Validators.required] // Added role control with default
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.authService.login(this.loginForm.value).subscribe({
        next: (response) => {
          console.log('Login successful', response);
          const role = response.role;
          if (response.user.role === 'DOCTOR') {
            this.router.navigate(['/doctor-workspace']);
            this.authService.currentUser$.next(true); // Trigger navbar update
          } else if (response.user.role === 'PATIENT') {
            this.router.navigate(['/patient-dashboard']);
            this.authService.currentUser$.next(true); // Trigger navbar update
          } else if (response.user.role === 'ADMIN') {
            this.router.navigate(['/admin']);
            this.authService.currentUser$.next(true);
          } else if (response.user.role === 'PHARMACIST') {
            this.router.navigate(['/pharmacist']);
            this.authService.currentUser$.next(true);
          } else {
            this.router.navigate(['/dashboard']);
            this.authService.currentUser$.next(true);
          }
        },
        error: (err: any) => {
          console.error('Login failed', err);
          this.errorMessage = 'Invalid email or password';
        }
      });
    }
  }
}
