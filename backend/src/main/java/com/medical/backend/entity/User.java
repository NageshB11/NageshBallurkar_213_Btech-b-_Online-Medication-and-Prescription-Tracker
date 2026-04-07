package com.medical.backend.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "users")
@Data
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    private String fullName;

    @Enumerated(EnumType.STRING)
    private Role role;

    // Doctor specific
    private String medicalLicenseNumber;
    private String specialization;

    // Pharmacist specific
    private String pharmacyName;
    private String pharmacyLicenseNumber;
    private String shopDetails;

    // Patient specific
    @Column(columnDefinition = "TEXT")
    private String medicalHistory;

    @Column(columnDefinition = "TEXT")
    private String allergies;

    @Column(columnDefinition = "boolean default false")
    private boolean isVerified = false;

    // Analytics specific
    @Column(columnDefinition = "double default 80.0")
    private Double adherenceThreshold = 80.0;

    // Security & User 360
    @Column(columnDefinition = "boolean default true")
    private boolean isActive = true;

    private java.time.LocalDateTime lastLogin;
    
    private String lastIpAddress;

    private String phone;
    
    private String address;

    @Transient
    private Double adherenceScore;

    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getPassword() {
        return this.password;
    }

    @com.fasterxml.jackson.annotation.JsonProperty
    public void setPassword(String password) {
        this.password = password;
    }
}