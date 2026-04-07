package com.medical.backend.controller;

import com.medical.backend.dto.AdherenceDataPoint;
import com.medical.backend.service.AdherenceAnalyticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.medical.backend.entity.User;
import com.medical.backend.entity.Role;
import com.medical.backend.repository.UserRepository;
@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "*")
public class AnalyticsController {

    @Autowired
    private AdherenceAnalyticsService analyticsService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/adherence-trend/{patientId}")
    public ResponseEntity<List<AdherenceDataPoint>> getAdherenceTrend(
            @PathVariable Long patientId,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = userRepository.findByEmail(auth.getName()).orElse(null);

        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }

        boolean isOwnData = currentUser.getId().equals(patientId);
        boolean isMedicalStaff = currentUser.getRole() == Role.DOCTOR || currentUser.getRole() == Role.ADMIN;

        if (!isOwnData && !isMedicalStaff) {
            return ResponseEntity.status(403).build();
        }

        List<AdherenceDataPoint> trend = analyticsService.getAdherenceTrend(patientId, month, year);
        return ResponseEntity.ok(trend);
    }

    @GetMapping("/adherence-score/{patientId}")
    public ResponseEntity<Double> getOverallAdherence(@PathVariable Long patientId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = userRepository.findByEmail(auth.getName()).orElse(null);

        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }

        boolean isOwnData = currentUser.getId().equals(patientId);
        boolean isMedicalStaff = currentUser.getRole() == Role.DOCTOR || currentUser.getRole() == Role.ADMIN;

        if (!isOwnData && !isMedicalStaff) {
            return ResponseEntity.status(403).build();
        }

        double score = analyticsService.getOverallAdherence(patientId);
        return ResponseEntity.ok(score);
    }
}
