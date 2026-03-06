package com.medical.backend.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "schedule_items")
public class ScheduleItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "schedule_id", nullable = false)
    private MedicationSchedule schedule;

    @ManyToOne
    @JoinColumn(name = "medicine_id")
    private Medicine medicine;

    @ManyToOne
    @JoinColumn(name = "prescription_item_id")
    private PrescriptionItem prescriptionItem;

    private String medicineName; // denormalized for display

    private String dosage;

    @Enumerated(EnumType.STRING)
    private Frequency frequency = Frequency.DAILY;

    private String daysOfWeek; // e.g. "MON,WED,FRI"

    // Doctor-set clinical layer (immutable by patient)
    private String mealSlots; // e.g. "BREAKFAST,LUNCH,DINNER"
    private String foodInstruction; // "BEFORE_FOOD" | "AFTER_FOOD" | "WITH_FOOD" | "ANY"

    // Fallback for non-meal-based schedules
    private String reminderTimes; // JSON: ["08:00","14:00"]

    private Integer durationDays;

    private String instructions;

    public enum Frequency {
        DAILY, ALTERNATE_DAY, WEEKLY, CUSTOM
    }
}
