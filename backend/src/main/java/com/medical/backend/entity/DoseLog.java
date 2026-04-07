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

    public enum DoseStatus {
        PENDING, TAKEN, MISSED, SKIPPED, SNOOZED
    }
}
