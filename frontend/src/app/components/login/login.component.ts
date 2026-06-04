import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';

  // Forgot password modal state
  showForgotModal: boolean = false;
  forgotEmail: string = '';
  forgotLoading: boolean = false;
  forgotSuccessMsg: string = '';
  forgotErrorMsg: string = '';

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
          if (err.error && err.error.message) {
            this.errorMessage = err.error.message;
          } else {
            this.errorMessage = 'Invalid email or password';
          }
        }
      });
    }
  }

  openForgotModal(event: Event): void {
    event.preventDefault(); // Prevents navigating back to landing page
    this.showForgotModal = true;
    this.forgotEmail = '';
    this.forgotSuccessMsg = '';
    this.forgotErrorMsg = '';
    this.forgotLoading = false;
  }

  closeForgotModal(): void {
    this.showForgotModal = false;
  }

  submitForgotPassword(): void {
    if (!this.forgotEmail || !this.forgotEmail.includes('@')) {
      this.forgotErrorMsg = 'Please enter a valid email address.';
      return;
    }

    this.forgotLoading = true;
    this.forgotErrorMsg = '';
    this.forgotSuccessMsg = '';

    this.authService.forgotPassword(this.forgotEmail).subscribe({
      next: (res: any) => {
        this.forgotLoading = false;
        this.forgotSuccessMsg = `Password reset successfully! Use the temporary password below to log in: <br><strong>${res.tempPassword}</strong>`;
      },
      error: (err: any) => {
        this.forgotLoading = false;
        if (err.error && err.error.message) {
          this.forgotErrorMsg = err.error.message;
        } else {
          this.forgotErrorMsg = 'An error occurred. Please try again later.';
        }
      }
    });
  }
}
