package com.medical.backend.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Data
public class MedScheduleDTO {

    // For create/update requests
    private Long prescriptionId;
    private String scheduleName;
    private LocalDate startDate;

    // Patient's meal times (Step 1 of wizard)
    private LocalTime breakfastTime;
    private LocalTime lunchTime;
    private LocalTime dinnerTime;
    private Integer preMealOffsetMinutes;

    // Items to schedule
    private List<ScheduleItemRequest> items;

    @Data
    public static class ScheduleItemRequest {
        private Long prescriptionItemId;
        private Long medicineId;
        private String medicineName;
        private String dosage;
        private String frequency; // DAILY|ALTERNATE_DAY|WEEKLY|CUSTOM
        private String daysOfWeek;
        private Integer durationDays;
        private String instructions;
        // mealSlots + foodInstruction are inherited from PrescriptionItem — not
        // editable by patient
    }
}
