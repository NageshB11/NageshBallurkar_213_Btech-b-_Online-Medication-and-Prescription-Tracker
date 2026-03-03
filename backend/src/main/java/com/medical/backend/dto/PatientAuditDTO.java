package com.medical.backend.dto;

import java.util.List;

/**
 * Groups all PrescriptionAudit records for a single prescription
 * under one parent object, with delta detection between versions.
 */
public class PatientAuditDTO {

    private Long prescriptionId;
    private String patientName;

    /** Audit versions sorted descending (newest first) */
    private List<AuditVersionDTO> versions;

    public static class AuditVersionDTO {
        private Long auditId;
        private String versionLabel; // e.g. "v1.0", "v1.1"
        private String actionType; // ISSUED | DISPENSED | RENEWED
        private String prescribedByName;
        private String dispensedByName;
        private String medicineName;
        private String dosage;
        private String duration;
        private String modifiedAt;
        private String modifiedBy;
        private String snapshotJson;

        /** Delta fields — populated when comparing to the previous version */
        private String prevMedicineName;
        private String prevDosage;
        private String prevDuration;
        private boolean hasDelta;

        // ── Getters & Setters ──────────────────────────────────────────────
        public Long getAuditId() {
            return auditId;
        }

        public void setAuditId(Long auditId) {
            this.auditId = auditId;
        }

        public String getVersionLabel() {
            return versionLabel;
        }

        public void setVersionLabel(String versionLabel) {
            this.versionLabel = versionLabel;
        }

        public String getActionType() {
            return actionType;
        }

        public void setActionType(String actionType) {
            this.actionType = actionType;
        }

        public String getPrescribedByName() {
            return prescribedByName;
        }

        public void setPrescribedByName(String prescribedByName) {
            this.prescribedByName = prescribedByName;
        }

        public String getDispensedByName() {
            return dispensedByName;
        }

        public void setDispensedByName(String dispensedByName) {
            this.dispensedByName = dispensedByName;
        }

        public String getMedicineName() {
            return medicineName;
        }

        public void setMedicineName(String medicineName) {
            this.medicineName = medicineName;
        }

        public String getDosage() {
            return dosage;
        }

        public void setDosage(String dosage) {
            this.dosage = dosage;
        }

        public String getDuration() {
            return duration;
        }

        public void setDuration(String duration) {
            this.duration = duration;
        }

        public String getModifiedAt() {
            return modifiedAt;
        }

        public void setModifiedAt(String modifiedAt) {
            this.modifiedAt = modifiedAt;
        }

        public String getModifiedBy() {
            return modifiedBy;
        }

        public void setModifiedBy(String modifiedBy) {
            this.modifiedBy = modifiedBy;
        }

        public String getSnapshotJson() {
            return snapshotJson;
        }

        public void setSnapshotJson(String snapshotJson) {
            this.snapshotJson = snapshotJson;
        }

        public String getPrevMedicineName() {
            return prevMedicineName;
        }

        public void setPrevMedicineName(String prevMedicineName) {
            this.prevMedicineName = prevMedicineName;
        }

        public String getPrevDosage() {
            return prevDosage;
        }

        public void setPrevDosage(String prevDosage) {
            this.prevDosage = prevDosage;
        }

        public String getPrevDuration() {
            return prevDuration;
        }

        public void setPrevDuration(String prevDuration) {
            this.prevDuration = prevDuration;
        }

        public boolean isHasDelta() {
            return hasDelta;
        }

        public void setHasDelta(boolean hasDelta) {
            this.hasDelta = hasDelta;
        }
    }

    // ── Getters & Setters ──────────────────────────────────────────────────
    public Long getPrescriptionId() {
        return prescriptionId;
    }

    public void setPrescriptionId(Long prescriptionId) {
        this.prescriptionId = prescriptionId;
    }

    public String getPatientName() {
        return patientName;
    }

    public void setPatientName(String patientName) {
        this.patientName = patientName;
    }

    public List<AuditVersionDTO> getVersions() {
        return versions;
    }

    public void setVersions(List<AuditVersionDTO> versions) {
        this.versions = versions;
    }
}
