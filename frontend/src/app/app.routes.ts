import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ProfileComponent } from './components/profile/profile.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { LandingComponent } from './components/landing/landing.component';
import { PrescriptionComponent } from './components/prescription/prescription.component';

export const routes: Routes = [
    { path: 'landing', component: LandingComponent },
    { path: 'login', component: LoginComponent },
    { path: 'register', component: RegisterComponent },
    { path: 'signup', redirectTo: 'register', pathMatch: 'full' },
    {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [authGuard]
    },
    {
        path: 'profile',
        component: ProfileComponent,
        canActivate: [authGuard]
    },
    {
        path: 'doctor',
        loadComponent: () => import('./components/doctor-layout/doctor-layout.component').then(m => m.DoctorLayoutComponent),
        canActivate: [authGuard, roleGuard],
        data: { role: 'DOCTOR' },
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./components/doctor-dashboard/doctor-dashboard.component').then(m => m.DoctorDashboardComponent)
            },
            {
                path: 'appointments',
                loadComponent: () => import('./components/doctor-appointments/doctor-appointments.component').then(m => m.DoctorAppointmentsComponent)
            },
            {
                path: 'analytics',
                loadComponent: () => import('./components/doctor-analytics/doctor-analytics.component').then(m => m.DoctorAnalyticsComponent)
            },
            {
                path: 'patients',
                loadComponent: () => import('./components/my-patients/my-patients.component').then(m => m.MyPatientsComponent)
            },
            {
                path: 'patients/:id',
                loadComponent: () => import('./components/patient-profile/patient-profile.component').then(m => m.PatientProfileComponent)
            }
        ]
    },
    {
        path: 'doctor-workspace',
        redirectTo: 'doctor/dashboard',
        pathMatch: 'full'
    },
    {
        path: 'doctor-appointments',
        redirectTo: 'doctor/appointments',
        pathMatch: 'full'
    },
    {
        path: 'patients',
        redirectTo: 'doctor/patients',
        pathMatch: 'full'
    },
    {
        path: 'issue-prescription',
        component: PrescriptionComponent,
        canActivate: [authGuard, roleGuard],
        data: { role: 'DOCTOR' }
    },
    {
        path: 'prescription',
        redirectTo: 'issue-prescription',
        pathMatch: 'full'
    },
    {
        path: 'patient-dashboard',
        loadComponent: () => import('./components/patient-dashboard/patient-dashboard.component').then(m => m.PatientDashboardComponent),
        canActivate: [authGuard, roleGuard],
        data: { role: 'PATIENT' }
    },
    {
        path: 'prescriptions',
        loadComponent: () => import('./components/prescription-list/prescription-list.component').then(m => m.PrescriptionListComponent),
        canActivate: [authGuard, roleGuard],
        data: { role: 'PATIENT' }
    },
    {
        path: 'prescriptions/:id',
        loadComponent: () => import('./components/prescription-detail/prescription-detail.component').then(m => m.PrescriptionDetailComponent),
        canActivate: [authGuard, roleGuard],
        data: { role: 'PATIENT' }
    },
    {
        path: 'notifications',
        loadComponent: () => import('./components/notification-center/notification-center.component').then(m => m.NotificationCenterComponent),
        canActivate: [authGuard]
    },
    {
        path: 'admin',
        loadComponent: () => import('./components/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
        canActivate: [authGuard, roleGuard],
        data: { role: 'ADMIN' },
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./components/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
            },
            {
                path: 'verification',
                loadComponent: () => import('./components/verification-queue/verification-queue.component').then(m => m.VerificationQueueComponent)
            },
            {
                path: 'audit-trace',
                loadComponent: () => import('./components/audit-trace/audit-trace.component').then(m => m.AuditTraceComponent)
            },
            {
                path: 'patient-history',
                loadComponent: () => import('./components/patient-audit-timeline/patient-audit-timeline.component').then(m => m.PatientAuditTimelineComponent)
            },
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            }
        ]
    },
    {
        path: 'pharmacist',
        loadComponent: () => import('./components/pharmacist-layout/pharmacist-layout.component').then(m => m.PharmacistLayoutComponent),
        canActivate: [authGuard, roleGuard],
        data: { role: 'PHARMACIST' },
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./components/pharmacist-dashboard/pharmacist-dashboard.component').then(m => m.PharmacistDashboardComponent)
            },
            {
                path: 'inventory',
                loadComponent: () => import('./components/inventory-dashboard-v2/inventory-dashboard-v2.component').then(m => m.InventoryDashboardV2Component)
            },
            {
                path: 'analytics',
                loadComponent: () => import('./components/pharmacy-intelligence/pharmacy-intelligence.component').then(m => m.PharmacyIntelligenceComponent)
            },
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            }
        ]
    },
    {
        path: 'pending-verification',
        loadComponent: () => import('./components/pending-verification/pending-verification.component').then(m => m.PendingVerificationComponent)
    },
    // ── Medication Schedule Module ────────────────────────────────────
    {
        path: 'schedules',
        loadComponent: () => import('./components/medication-schedule-list/medication-schedule-list.component').then(m => m.MedicationScheduleListComponent),
        canActivate: [authGuard, roleGuard],
        data: { role: 'PATIENT' }
    },
    {
        path: 'schedules/create',
        loadComponent: () => import('./components/medication-schedule-create/medication-schedule-create.component').then(m => m.MedicationScheduleCreateComponent),
        canActivate: [authGuard, roleGuard],
        data: { role: 'PATIENT' }
    },
    {
        path: 'schedules/:id/audit',
        loadComponent: () => import('./components/schedule-audit-timeline/schedule-audit-timeline.component').then(m => m.ScheduleAuditTimelineComponent),
        canActivate: [authGuard]
    },
    {
        path: 'doses/today',
        loadComponent: () => import('./components/dose-tracker/dose-tracker.component').then(m => m.DoseTrackerComponent),
        canActivate: [authGuard, roleGuard],
        data: { role: 'PATIENT' }
    },
    {
        path: 'analytics/schedules',
        loadComponent: () => import('./components/schedule-analytics-dashboard/schedule-analytics-dashboard.component').then(m => m.ScheduleAnalyticsDashboardComponent),
        canActivate: [authGuard]
    },
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
    },
    {
        path: '**',
        redirectTo: 'login'
    }
];
