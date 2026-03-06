package com.medical.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "schedule_audit")
public class ScheduleAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "schedule_id", nullable = false)
    private MedicationSchedule schedule;

    @ManyToOne
    @JoinColumn(name = "changed_by", nullable = false)
    private User changedBy;

    @Enumerated(EnumType.STRING)
    private ChangeType changeType;

    @Column(columnDefinition = "TEXT")
    private String changeSummary;

    @Column(columnDefinition = "TEXT")
    private String snapshotJson;

    private String versionLabel; // e.g. "1.0", "1.1"

    private LocalDateTime changedAt = LocalDateTime.now();

    public enum ChangeType {
        CREATED, MODIFIED, PAUSED, RESUMED, CANCELLED
    }
}
