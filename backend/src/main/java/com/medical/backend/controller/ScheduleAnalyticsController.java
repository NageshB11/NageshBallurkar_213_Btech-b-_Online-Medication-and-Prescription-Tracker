package com.medical.backend.controller;

import com.medical.backend.config.JwtUtil;
import com.medical.backend.dto.ScheduleAnalyticsDTO;
import com.medical.backend.service.ScheduleAnalyticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics/schedules")
@CrossOrigin(origins = "http://localhost:4200")
public class ScheduleAnalyticsController {

    @Autowired
    private ScheduleAnalyticsService analyticsService;
    @Autowired
    private JwtUtil jwtUtil;

    private String emailFrom(String token) {
        return jwtUtil.extractUsername(token.substring(7));
    }

    @GetMapping("/adherence")
    public ResponseEntity<List<ScheduleAnalyticsDTO>> getAdherence() {
        return ResponseEntity.ok(analyticsService.getAdherenceRates());
    }

    @GetMapping("/top-medicines")
    public ResponseEntity<List<Map<String, Object>>> getTopMedicines() {
        return ResponseEntity.ok(analyticsService.getTopScheduledMedicines());
    }

    @GetMapping("/missed-doses")
    public ResponseEntity<List<ScheduleAnalyticsDTO>> getMissedDosePatients() {
        return ResponseEntity.ok(analyticsService.getHighMissRatePatients());
    }

    /** Patient-facing: returns own 30-day adherence as { percent, label } */
    @GetMapping("/my-adherence")
    public ResponseEntity<Map<String, Object>> getMyAdherence(
            @RequestHeader("Authorization") String token) {
        double pct = analyticsService.getPatientAdherence(emailFrom(token));
        return ResponseEntity.ok(Map.of(
                "percent", pct,
                "label", pct >= 80 ? "Good" : pct >= 50 ? "Fair" : "Poor"));
    }

    @GetMapping("/patient-trend/{id}")
    public ResponseEntity<List<Map<String, Object>>> getPatientTrend(
            @PathVariable("id") Long patientId,
            @RequestParam(defaultValue = "14") int days) {
        return ResponseEntity.ok(analyticsService.getAdherenceTrend(patientId, days));
    }

    @Autowired
    private com.medical.backend.repository.UserRepository userRepository;

    @GetMapping("/my-trend")
    public ResponseEntity<List<Map<String, Object>>> getMyTrend(
            @RequestHeader("Authorization") String token,
            @RequestParam(defaultValue = "14") int days) {

        String email = emailFrom(token);
        com.medical.backend.entity.User patient = userRepository.findByEmail(email).orElse(null);

        if (patient == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(analyticsService.getAdherenceTrend(patient.getId(), days));
    }
}
