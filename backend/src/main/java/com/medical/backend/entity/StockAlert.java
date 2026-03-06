package com.medical.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "stock_alerts")
public class StockAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "medicine_id", nullable = false)
    private Medicine medicine;

    @Enumerated(EnumType.STRING)
    private AlertType alertType;

    private LocalDateTime raisedAt = LocalDateTime.now();

    private LocalDateTime resolvedAt;

    private boolean isResolved = false;

    public enum AlertType {
        LOW_STOCK, OUT_OF_STOCK
    }
}
