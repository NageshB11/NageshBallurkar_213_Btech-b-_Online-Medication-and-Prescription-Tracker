package com.medical.backend.dto;

import com.medical.backend.entity.AlertLog;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
public class SystemStatsDTO {
    private long totalPatients;
    private long totalDoctors;
    private long totalPharmacists;
    private long totalPrescriptions;
    private long dispensedPrescriptions;
    private long activeUsers;
    private double dispensingRate;

    private Map<String, Double> pharmacistPerformance;
    private Map<String, Long> globalAdherence;

    private long pendingVerificationsCount;

    // New: System Alert Feed
    private List<AlertLog> recentAlerts;

    // Constructor without alerts (backward-compatible)
    public SystemStatsDTO(long totalPatients, long totalDoctors, long totalPharmacists,
                          long totalPrescriptions, long dispensedPrescriptions, long activeUsers,
                          double dispensingRate, Map<String, Double> pharmacistPerformance,
                          Map<String, Long> globalAdherence, long pendingVerificationsCount) {
        this.totalPatients = totalPatients;
        this.totalDoctors = totalDoctors;
        this.totalPharmacists = totalPharmacists;
        this.totalPrescriptions = totalPrescriptions;
        this.dispensedPrescriptions = dispensedPrescriptions;
        this.activeUsers = activeUsers;
        this.dispensingRate = dispensingRate;
        this.pharmacistPerformance = pharmacistPerformance;
        this.globalAdherence = globalAdherence;
        this.pendingVerificationsCount = pendingVerificationsCount;
    }
}
