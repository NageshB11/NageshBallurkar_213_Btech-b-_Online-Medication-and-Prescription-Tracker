package com.medical.backend.dto;

import lombok.Data;

@Data
public class ScheduleAnalyticsDTO {
    private Long patientId;
    private String patientName;
    private long totalDoses;
    private long takenCount;
    private long missedCount;
    private long skippedCount;
    private double adherencePercent;
    private boolean highMissRate; // true if >30% missed
}
