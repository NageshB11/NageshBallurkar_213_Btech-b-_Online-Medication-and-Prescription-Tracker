import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Role } from '../../models/role.enum';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  registerForm: FormGroup;
  errorMessage: string = '';
  // Expose Role enum to template
  Role = Role;
  roles = Object.values(Role);

  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      fullName: ['', Validators.required],
      role: [Role.PATIENT, Validators.required],
      medicalLicenseNumber: [''],
      specialization: [''],
      shopDetails: [''],
      medicalHistory: ['']
    });

    // Subscribe to role changes to update validators
    this.registerForm.get('role')?.valueChanges.subscribe(role => {
      this.updateValidators(role);
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  updateValidators(role: Role) {
    const medicalLicenseControl = this.registerForm.get('medicalLicenseNumber');
    const specializationControl = this.registerForm.get('specialization');
    const shopDetailsControl = this.registerForm.get('shopDetails');
    const medicalHistoryControl = this.registerForm.get('medicalHistory');

    // Reset all validators first
    medicalLicenseControl?.clearValidators();
    specializationControl?.clearValidators();
    shopDetailsControl?.clearValidators();
    medicalHistoryControl?.clearValidators();

    if (role === Role.DOCTOR) {
      medicalLicenseControl?.setValidators([Validators.required]);
      specializationControl?.setValidators([Validators.required]);
    } else if (role === Role.PHARMACIST) {
      shopDetailsControl?.setValidators([Validators.required]);
    } else if (role === Role.PATIENT) {
      // Medical history is optional in the user request ("A 'Medical History' textarea appears"), 
      // but often textareas are optional. The prompt didn't say it's REQUIRED.
      // However, I should make sure the previous code didn't have logic I missed.
      // Previous code didn't set validators for Patient.
    }

    medicalLicenseControl?.updateValueAndValidity();
    specializationControl?.updateValueAndValidity();
    shopDetailsControl?.updateValueAndValidity();
    medicalHistoryControl?.updateValueAndValidity();
  }

  onSubmit(): void {
    console.log('Form Status:', this.registerForm.status);
    console.log('Form Valid:', this.registerForm.valid);
    console.log('Form Value:', this.registerForm.value);

    if (this.registerForm.invalid) {
      console.error('Form Invalid. Errors:', this.getFormValidationErrors());
      this.registerForm.markAllAsTouched();
      return;
    }

    if (this.registerForm.valid) {
      const user: User = this.registerForm.value;
      console.log('Submitting user:', user);

      this.authService.register(user).subscribe({
        next: (response: any) => {
          console.log('Registration successful', response);
          this.router.navigate(['/login']);
        },
        error: (err: any) => {
          console.error('Registration failed RESPONSE:', err);
          // Extract error message from backend response
          if (typeof err.error === 'string') {
            this.errorMessage = err.error;
          } else if (err.error && err.error.message) {
            this.errorMessage = err.error.message;
          } else {
            // Fallback: Show the full error object for debugging
            this.errorMessage = 'Registration failed: ' + JSON.stringify(err.error);
          }
        }
      });
    }
  }

  getFormValidationErrors() {
    const result: any = {};
    Object.keys(this.registerForm.controls).forEach(key => {
      const controlErrors = this.registerForm.get(key)?.errors;
      if (controlErrors) {
        result[key] = controlErrors;
      }
    });
    return result;
  }
}
