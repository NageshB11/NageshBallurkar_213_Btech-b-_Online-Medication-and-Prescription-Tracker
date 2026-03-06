package com.medical.backend.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class DoseLogDTO {
    private Long doseId;
    private String medicineName;
    private String dosage;
    private String mealSlot; // "BREAKFAST" | "LUNCH" | "DINNER" | "CUSTOM"
    private String foodInstruction; // "BEFORE_FOOD" | "AFTER_FOOD"
    private String displayLabel; // "After Breakfast" | "Before Lunch"
    private String mealSlotIcon; // "🌅" | "☀️" | "🌙"
    private LocalDateTime scheduledTime;
    private LocalDateTime actualTime;
    private LocalDateTime snoozedUntil; // null if not snoozed
    private int snoozeCount; // number of times snoozed
    private String status;
    private String notes;
    private Long scheduleItemId;
}
