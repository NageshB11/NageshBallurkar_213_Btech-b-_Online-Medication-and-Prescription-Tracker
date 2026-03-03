export type PrescriptionStatus = 'PENDING' | 'ISSUED' | 'PROCEEDED_TO_PHARMACIST' | 'DISPENSED' | 'EXPIRED';

export interface PrescriptionItem {
    id?: number;
    medicineName: string;
    dosage: string;
    dosageTiming?: string;
    quantity: number;
    startDate?: string;
    endDate?: string;
}

export interface Prescription {
    id?: number;
    status?: PrescriptionStatus;
    version?: number;
    digitalSignature?: string;
    pdfUrl?: string;
    filePath?: string; // Added to match backend for file validation
    isDraft?: boolean;
    items: PrescriptionItem[];
    patientEmail?: string;
    patient?: any; // Added to match backend relationship
    doctor?: any; // Using any for now to avoid circular dependency or import User, or just use User if possible
    createdAt?: string; // Add if backend sends it
    expiryDate?: string;
    isDispensed?: boolean;
    dispensedAt?: string;
    pharmacist?: any;
}
