import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

import { User } from '../../models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  errorMessage: string = '';

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
    this.user = this.authService.getProfile();
    if (!this.user) {
      this.errorMessage = 'Could not load profile data.';
    }
  }
}
