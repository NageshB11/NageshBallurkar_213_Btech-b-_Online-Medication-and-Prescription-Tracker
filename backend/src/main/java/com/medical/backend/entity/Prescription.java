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

    private String auditVersion = "1.0";

    private Long updatedBy;

    @Transient
    private String patientEmail;

    @Transient
    private boolean overrideInteraction;

    @Transient
    private boolean skipAuditListener = false;

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

    private Long parentPrescriptionId;

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

    public boolean isSkipAuditListener() {
        return skipAuditListener;
    }

    public void setSkipAuditListener(boolean skipAuditListener) {
        this.skipAuditListener = skipAuditListener;
    }

    public String getAuditVersion() {
        return auditVersion;
    }

    public void setAuditVersion(String auditVersion) {
        this.auditVersion = auditVersion;
    }
}
