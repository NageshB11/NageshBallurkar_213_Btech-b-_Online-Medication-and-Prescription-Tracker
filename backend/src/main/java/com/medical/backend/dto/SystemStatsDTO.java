package com.medical.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Map;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SystemStatsDTO {
    private long totalPatients;
    private long totalDoctors;
    private long totalPharmacists;
    private long totalPrescriptions;
    private long dispensedPrescriptions;
    private long activeUsers;
    private double dispensingRate;

    private Map<String, Double> pharmacistPerformance; // Name -> Avg Hours to Dispense
    private Map<String, Long> globalAdherence; // "Success" -> count, "Missed" -> count
}
