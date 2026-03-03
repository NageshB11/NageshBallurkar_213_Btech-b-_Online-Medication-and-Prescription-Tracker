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
    private String shopDetails;

    // Patient specific
    @Column(columnDefinition = "TEXT")
    private String medicalHistory;

    @Column(columnDefinition = "boolean default false")
    private boolean isVerified = false;

    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getPassword() {
        return this.password;
    }

    @com.fasterxml.jackson.annotation.JsonProperty
    public void setPassword(String password) {
        this.password = password;
    }
}