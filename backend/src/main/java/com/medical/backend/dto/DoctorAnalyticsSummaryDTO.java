package com.medical.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DoctorAnalyticsSummaryDTO {
    private List<MonthlyMatrixPoint> monthlyMatrix;
    private List<RiskPatientDTO> riskList;
    private int kpiTotalPatients;
    private double kpiSuccessRate;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyMatrixPoint {
        private String month;
        private int countIssued;
        private double avgAdherence;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RiskPatientDTO {
        private Long patientId;
        private String patientName;
        private String patientEmail;
        private double adherenceScore;
        private String riskStatus; // RED (<50%), AMBER (50-75%), GREEN (>90%)
    }
}
