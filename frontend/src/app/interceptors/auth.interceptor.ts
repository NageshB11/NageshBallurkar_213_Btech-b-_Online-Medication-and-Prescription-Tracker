import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);
    const token = localStorage.getItem('authToken');

    let authReq = req;

    // Skip adding token ONLY for public auth endpoints (login/register)
    const isPublicAuth = req.url.includes('/api/auth/login') || req.url.includes('/api/auth/register');
    if (token && !isPublicAuth) {
        authReq = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    return next(authReq).pipe(
        catchError((error) => {
            if (error.status === 401) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('userRole');
                router.navigate(['/login']);
            }
            return throwError(() => error);
        })
    );
};
