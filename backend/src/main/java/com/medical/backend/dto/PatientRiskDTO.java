package com.medical.backend.dto;

import com.medical.backend.entity.User;

public class PatientRiskDTO {
    private Long patientId;
    private String patientName;
    private int adherenceScore; // 0-100
    private String riskLevel; // LOW, MEDIUM, HIGH
    private int missedDoses;
    private String lastPharmacistName;
    private java.time.LocalDateTime lastDispensedAt;
    private int prescriptionCount;
    @com.fasterxml.jackson.annotation.JsonProperty("hasWorkload")
    private boolean hasWorkload;

    public PatientRiskDTO(User patient, int adherenceScore, int missedDoses, int prescriptionCount) {
        this.patientId = patient.getId();
        this.patientName = patient.getFullName();
        this.adherenceScore = adherenceScore;
        this.missedDoses = missedDoses;
        this.prescriptionCount = prescriptionCount;
        this.riskLevel = calculateRiskLevel(adherenceScore);
    }

    private String calculateRiskLevel(int score) {
        if (score < 50)
            return "HIGH";
        if (score < 80)
            return "MEDIUM";
        return "LOW";
    }

    // Getters
    public Long getPatientId() {
        return patientId;
    }

    public String getPatientName() {
        return patientName;
    }

    public int getAdherenceScore() {
        return adherenceScore;
    }

    public String getRiskLevel() {
        return riskLevel;
    }

    public int getMissedDoses() {
        return missedDoses;
    }

    public String getLastPharmacistName() {
        return lastPharmacistName;
    }

    public void setLastPharmacistName(String lastPharmacistName) {
        this.lastPharmacistName = lastPharmacistName;
    }

    public java.time.LocalDateTime getLastDispensedAt() {
        return lastDispensedAt;
    }

    public void setLastDispensedAt(java.time.LocalDateTime lastDispensedAt) {
        this.lastDispensedAt = lastDispensedAt;
    }

    public int getPrescriptionCount() {
        return prescriptionCount;
    }

    public void setPrescriptionCount(int prescriptionCount) {
        this.prescriptionCount = prescriptionCount;
    }

    public boolean isHasWorkload() {
        return hasWorkload;
    }

    public void setHasWorkload(boolean hasWorkload) {
        this.hasWorkload = hasWorkload;
    }
}
