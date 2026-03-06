package com.medical.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "patient_meal_prefs")
public class PatientMealPrefs {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "patient_id", nullable = false, unique = true)
    private User patient;

    private LocalTime breakfastTime = LocalTime.of(8, 0);

    private LocalTime lunchTime = LocalTime.of(13, 0);

    private LocalTime dinnerTime = LocalTime.of(20, 0);

    private int preMealOffsetMinutes = 15;

    private LocalDateTime updatedAt;
}
