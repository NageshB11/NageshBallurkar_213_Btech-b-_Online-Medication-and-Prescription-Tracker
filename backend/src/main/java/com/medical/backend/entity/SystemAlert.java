package com.medical.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "system_alerts")
public class SystemAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String type; // e.g., "FRAUD_DETECTION"
    private String message;
    private String severity; // "LOW", "MEDIUM", "HIGH", "CRITICAL"

    private LocalDateTime timestamp;
    private boolean isResolved = false;

    @PrePersist
    public void prePersist() {
        this.timestamp = LocalDateTime.now();
    }
}
