package com.medical.backend.controller;

import com.medical.backend.config.JwtUtil;
import com.medical.backend.entity.HealthVitals;
import com.medical.backend.entity.User;
import com.medical.backend.repository.HealthVitalsRepository;
import com.medical.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/vitals")
@CrossOrigin(origins = "http://localhost:4200")
public class HealthVitalsController {

    @Autowired
    private HealthVitalsRepository healthVitalsRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping
    public ResponseEntity<?> addVitals(@RequestHeader("Authorization") String token, @RequestBody HealthVitals vitals) {
        String email = jwtUtil.extractUsername(token.substring(7));
        User patient = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("Patient not found"));

        vitals.setPatient(patient);
        vitals.setRecordDate(LocalDateTime.now());

        healthVitalsRepository.save(vitals);
        return ResponseEntity.ok("Vitals recorded successfully");
    }

    @GetMapping("/my")
    public ResponseEntity<List<HealthVitals>> getMyVitals(@RequestHeader("Authorization") String token) {
        String email = jwtUtil.extractUsername(token.substring(7));
        User patient = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("Patient not found"));

        return ResponseEntity.ok(healthVitalsRepository.findByPatientIdOrderByRecordDateDesc(patient.getId()));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<HealthVitals>> getPatientVitals(@PathVariable("patientId") Long patientId) {
        return ResponseEntity.ok(healthVitalsRepository.findByPatientIdOrderByRecordDateDesc(patientId));
    }
}
