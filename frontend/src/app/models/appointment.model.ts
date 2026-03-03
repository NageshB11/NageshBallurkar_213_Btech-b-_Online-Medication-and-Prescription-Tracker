import { User } from './user.model';

export enum AppointmentStatus {
    REQUESTED = 'REQUESTED',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

export interface Appointment {
    id?: number;
    patientId?: number;
    doctorId?: number;
    patient?: User;
    doctor?: User;
    appointmentDate: string; // ISO string
    status: AppointmentStatus;
    notes?: string;
}
