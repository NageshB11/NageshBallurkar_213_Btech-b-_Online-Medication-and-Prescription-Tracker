import { Role } from './role.enum';

export interface User {
    id?: number;
    email: string;
    password?: string;
    fullName: string;
    role: Role;

    // Doctor specific
    medicalLicenseNumber?: string;
    specialization?: string;

    // Pharmacist specific
    pharmacyName?: string;
    pharmacyLicenseNumber?: string;
    shopDetails?: string;

    // Patient specific
    medicalHistory?: string;
    allergies?: string;

    // Contact
    phone?: string;
    address?: string;

    verified?: boolean;
}
