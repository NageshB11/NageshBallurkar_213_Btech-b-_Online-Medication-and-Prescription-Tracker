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
}
