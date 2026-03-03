package com.medical.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Data
@Table(name = "prescriptions")
@EntityListeners(com.medical.backend.listener.PrescriptionEntityListener.class)
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private PrescriptionStatus status;

    @Version
    private Long version;

    /**
     * Semantic audit version string (e.g. "1.0", "1.1"). Updated after each
     * meaningful lifecycle event.
     */
    private String auditVersion = "1.0";

    /** ID of the last user who modified this prescription */
    private Long updatedBy;

    @Transient
    private String patientEmail;

    private String digitalSignature;

    private String pdfUrl;

    @Column(columnDefinition = "boolean default false")
    private boolean isDraft;

    private LocalDateTime createdAt = LocalDateTime.now();

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    // private int version = 1; // Removed duplicate

    private Long parentPrescriptionId; // For cloning/renewing

    @Column(name = "file_path", length = 512)
    private String filePath;

    @ManyToOne
    @JoinColumn(name = "patient_id")
    private User patient;

    @ManyToOne
    @JoinColumn(name = "doctor_id")
    private User doctor;

    @OneToMany(mappedBy = "prescription", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PrescriptionItem> items;

    @Column(columnDefinition = "boolean default false")
    private boolean isDispensed;

    private LocalDateTime dispensedAt;

    @ManyToOne
    @JoinColumn(name = "pharmacist_id")
    private User pharmacist;

    public enum PrescriptionStatus {
        PENDING,
        APPROVED,
        ISSUED,
        PROCEEDED_TO_PHARMACIST,
        DISPENSED,
        EXPIRED
    }
}
