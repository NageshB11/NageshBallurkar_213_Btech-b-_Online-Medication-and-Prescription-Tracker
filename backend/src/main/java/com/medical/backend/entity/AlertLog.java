package com.medical.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "alert_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AlertLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String message;

    @Column(nullable = false)
    private String severity; // ERROR, WARNING, INFO

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        if (this.timestamp == null) {
            this.timestamp = LocalDateTime.now();
        }
    }

    @PreUpdate
    @PreRemove
    protected void onModify() {
        throw new UnsupportedOperationException("AlertLog records are append-only and immutable for compliance reasons.");
    }
}
