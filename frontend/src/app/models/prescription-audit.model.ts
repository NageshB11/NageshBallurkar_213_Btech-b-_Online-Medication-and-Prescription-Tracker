export interface PrescriptionAudit {
    id: number;
    prescriptionId: number;
    version: number;
    oldData: string;
    newData: string;
    changeReason: string;
    modifiedAt: string;
    modifiedBy: string;
}
