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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescription_id")
    @JsonIgnore
    private Prescription prescription;
}
