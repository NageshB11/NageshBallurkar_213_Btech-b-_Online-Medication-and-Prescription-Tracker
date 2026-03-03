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

    public PatientRiskDTO(User patient, int adherenceScore, int missedDoses) {
        this.patientId = patient.getId();
        this.patientName = patient.getFullName();
        this.adherenceScore = adherenceScore;
        this.missedDoses = missedDoses;
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
}
