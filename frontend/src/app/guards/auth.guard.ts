import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    const role = authService.getRole();
    const isVerified = authService.isVerified();

    // If professional and not verified, redirect to pending page
    if ((role === 'DOCTOR' || role === 'PHARMACIST') && !isVerified) {
      if (state.url !== '/pending-verification') {
        router.navigate(['/pending-verification']);
        return false;
      }
    }
    return true;
  } else {
    router.navigate(['/login']);
    return false;
  }
};
