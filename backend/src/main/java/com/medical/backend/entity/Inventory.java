package com.medical.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Entity
@Table(name = "inventory")
@Data
public class Inventory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "pharmacist_id")
    private User pharmacist;

    @Column(name = "drug_name", nullable = false)
    private String drugName;

    @Column(name = "batch_no", nullable = false)
    private String batchNo;

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private Integer threshold;

    @Enumerated(EnumType.STRING)
    private InventoryStatus status = InventoryStatus.ACTIVE;

    public enum InventoryStatus {
        ACTIVE,
        LOW_STOCK,
        EXPIRED,
        ARCHIVED
    }
}
