package com.medical.backend.dto;

import lombok.Data;

@Data
public class DoctorAnalyticsDTO {
    private long totalPrescriptions;
    private long pendingCount;
    private long approvedCount;
    private long dispensedCount;
    private long activePatientsCount;
    private double adherenceRate;
    // Add more fields later like monthly stats
}
