import { User } from './user.model';
import { Prescription } from './prescription.model';

export interface AdherenceLog {
    id?: number;
    patientId?: number;
    prescriptionId?: number;
    patient?: User;
    prescription?: Prescription;
    logDate: string;
}
