import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const expectedRole = route.data['role'];

  console.log('RoleGuard check:', {
    isLoggedIn: authService.isLoggedIn(),
    userRole: authService.getRole(),
    expectedRole
  });


  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  const userRole = authService.getRole();

  if (userRole === expectedRole) {
    return true;
  }

  // Admin override?
  if (userRole === 'ADMIN') {
    return true;
  }

  console.warn('Role mismatch', { userRole, expectedRole });
  // Redirect to dashboard if role mismatch, or home if no role
  router.navigate(['/landing']);
  return false;
};
