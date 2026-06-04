package com.medical.backend.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "dose_logs", indexes = {
        @Index(name = "idx_doselog_patient_time", columnList = "patient_id, scheduled_time, status")
})
public class DoseLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescription_id_obj")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Prescription prescription;

    private Long prescriptionId; // Flat ID for the matrix requirement

    private String auditVersion = "1.0";

    private java.time.LocalDate date;

    @Enumerated(EnumType.STRING)
    private MealType meal;

    private boolean isTaken = false;
    private java.time.LocalDateTime takenAt;

    private String foodInstruction;

    // Keep these for compatibility with the existing notification/timer system
    @ManyToOne
    @JoinColumn(name = "schedule_item_id")
    private ScheduleItem scheduleItem;

    @ManyToOne
    @JoinColumn(name = "patient_id")
    private User patient;

    private String mealSlot; 
    private java.time.LocalDateTime scheduledTime;
    private java.time.LocalDateTime actualTime;
    private java.time.LocalDateTime snoozedUntil;
    private int snoozeCount = 0;

    @Enumerated(EnumType.STRING)
    private DoseStatus status = DoseStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public String getSafeMedicineName() {
        if (scheduleItem != null) {
            if (scheduleItem.getMedicineName() != null) {
                return scheduleItem.getMedicineName();
            }
            if (scheduleItem.getMedicine() != null) {
                return scheduleItem.getMedicine().getName();
            }
        }
        // Fallback to Prescription
        if (prescription != null && prescription.getItems() != null && !prescription.getItems().isEmpty()) {
            // Try to match mealSlot
            String slot = mealSlot != null ? mealSlot.toUpperCase() : (meal != null ? meal.name() : "");
            if (!slot.isEmpty()) {
                for (PrescriptionItem item : prescription.getItems()) {
                    if (item.getMealSlots() != null) {
                        String slotsUpper = item.getMealSlots().toUpperCase();
                        if (slotsUpper.contains(slot)) {
                            return item.getMedicineName();
                        }
                    }
                }
            }
            // Fallback to first item
            return prescription.getItems().get(0).getMedicineName();
        }
        return "Unknown Medicine";
    }

    public String getSafeDosage() {
        if (scheduleItem != null) {
            return scheduleItem.getDosage() != null ? scheduleItem.getDosage() : "1 tablet";
        }
        // Fallback to Prescription
        if (prescription != null && prescription.getItems() != null && !prescription.getItems().isEmpty()) {
            // Try to match mealSlot
            String slot = mealSlot != null ? mealSlot.toUpperCase() : (meal != null ? meal.name() : "");
            if (!slot.isEmpty()) {
                for (PrescriptionItem item : prescription.getItems()) {
                    if (item.getMealSlots() != null) {
                        String slotsUpper = item.getMealSlots().toUpperCase();
                        if (slotsUpper.contains(slot)) {
                            return item.getDosage() != null ? item.getDosage() : "1 tablet";
                        }
                    }
                }
            }
            // Fallback to first item
            return prescription.getItems().get(0).getDosage() != null ? prescription.getItems().get(0).getDosage() : "1 tablet";
        }
        return "1 tablet";
    }

    public Long getSafeScheduleItemId() {
        if (scheduleItem != null) {
            return scheduleItem.getId();
        }
        return null;
    }

    public enum DoseStatus {
        PENDING, TAKEN, MISSED, SKIPPED, SNOOZED
    }
}
