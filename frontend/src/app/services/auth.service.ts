import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';

import { User } from '../models/user.model';
import { Role } from '../models/role.enum';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8081/api/auth';
  private tokenKey = 'authToken';
  private roleKey = 'userRole';
  private nameKey = 'fullName';
  private idKey = 'userId';

  public currentUser$ = new BehaviorSubject<boolean>(this.isLoggedIn());

  constructor(private http: HttpClient, private router: Router) { }

  register(user: User): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, user);
  }

  login(credentials: { email: string, password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => {
        if (response.token) {
          localStorage.setItem(this.tokenKey, response.token);
          localStorage.setItem(this.roleKey, response.user.role);
          localStorage.setItem(this.nameKey, response.user.fullName);
          localStorage.setItem(this.idKey, response.user.id);
          localStorage.setItem('isVerified', response.user.verified.toString());
          localStorage.setItem('userProfile', JSON.stringify(response.user));
          this.currentUser$.next(true);
        }
      })
    );
  }

  getProfile(): User | null {
    const userStr = localStorage.getItem('userProfile');
    return userStr ? JSON.parse(userStr) : null;
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.roleKey);
    localStorage.removeItem(this.nameKey);
    localStorage.removeItem(this.idKey);
    localStorage.removeItem('isVerified');
    localStorage.removeItem('userProfile');
    this.currentUser$.next(false);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getRole(): string | null {
    return localStorage.getItem(this.roleKey);
  }

  getFullName(): string | null {
    return localStorage.getItem(this.nameKey);
  }

  getUserId(): string | null {
    return localStorage.getItem(this.idKey);
  }

  isVerified(): boolean {
    return localStorage.getItem('isVerified') === 'true';
  }
}
