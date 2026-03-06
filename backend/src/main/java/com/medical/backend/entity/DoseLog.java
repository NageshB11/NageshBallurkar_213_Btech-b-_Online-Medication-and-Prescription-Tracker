package com.medical.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "dose_logs", indexes = {
        @Index(name = "idx_doselog_patient_time", columnList = "patient_id, scheduled_time, status")
})
public class DoseLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "schedule_item_id", nullable = false)
    private ScheduleItem scheduleItem;

    @ManyToOne
    @JoinColumn(name = "patient_id", nullable = false)
    private User patient;

    private String mealSlot; // "BREAKFAST" | "LUNCH" | "DINNER" | "CUSTOM"
    private String foodInstruction; // "BEFORE_FOOD" | "AFTER_FOOD" | "WITH_FOOD" | "ANY"

    @Column(nullable = false)
    private LocalDateTime scheduledTime;

    private LocalDateTime actualTime;

    private LocalDateTime snoozedUntil; // set when patient snoozes; null otherwise
    private int snoozeCount = 0; // tracks how many times snoozed

    @Enumerated(EnumType.STRING)
    private DoseStatus status = DoseStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public enum DoseStatus {
        PENDING, TAKEN, MISSED, SKIPPED, SNOOZED
    }
}
