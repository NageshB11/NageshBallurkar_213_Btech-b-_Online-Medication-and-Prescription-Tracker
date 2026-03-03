package com.medical.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "prescription_audit")
public class PrescriptionAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long prescriptionId;

    /** Human-readable semantic version: v1.0, v1.1, v1.2 … */
    private String versionLabel;

    /** ISSUED | DISPENSED | RENEWED */
    private String actionType;

    // ---- Who did what ----
    private Long prescribedById;
    private String prescribedByName;

    private Long dispensedById;
    private String dispensedByName;

    // ---- Clinical data (first item) ----
    private String medicineName;
    private String dosage;
    private String duration;

    /** Full JSON snapshot of the prescription at the time of the event */
    @Column(columnDefinition = "TEXT")
    private String snapshotJson;

    /** Legacy field – kept for backward compat */
    @Column(columnDefinition = "TEXT")
    private String auditData;

    private String changeReason;

    private LocalDateTime modifiedAt;
    private String modifiedBy;

    @PrePersist
    public void prePersist() {
        if (this.modifiedAt == null) {
            this.modifiedAt = LocalDateTime.now();
        }
    }
}
