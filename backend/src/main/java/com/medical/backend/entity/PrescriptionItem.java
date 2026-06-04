package com.medical.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Data
@Table(name = "prescription_items")
public class PrescriptionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String medicineName;
    private String dosage;
    private int quantity;

    private String dosageTiming;
    private String mealSlots; // e.g. "BREAKFAST,LUNCH,DINNER"
    private String foodInstruction; // "BEFORE_FOOD" | "AFTER_FOOD" | "WITH_FOOD" | "ANY"
    private java.time.LocalDate startDate;
    private java.time.LocalDate endDate;
    private boolean isOptional = false;

    // Safety & Audit Fields (External API Integration)
    private String rxcui;
    private String batchNumber;
    private String contraindicationFlags;
    private Boolean available;

    public java.time.LocalDate getItemStartDate() {
        return startDate;
    }

    public int calculateTotalQuantity() {
        long days = 1;
        if (startDate != null && endDate != null) {
            days = java.time.temporal.ChronoUnit.DAYS.between(startDate, endDate) + 1;
            if (days <= 0) {
                days = 1;
            }
        }
        return (int) (days * quantity);
    }

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescription_id")
    @JsonIgnore
    private Prescription prescription;
}
