package com.medical.backend.controller;

import com.medical.backend.config.JwtUtil;
import com.medical.backend.dto.DoseLogDTO;
import com.medical.backend.service.DoseTrackingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doses")
@CrossOrigin(origins = "http://localhost:4200")
public class DoseLogController {

    @Autowired
    private DoseTrackingService doseTrackingService;
    @Autowired
    private JwtUtil jwtUtil;

    private String emailFrom(String token) {
        return jwtUtil.extractUsername(token.substring(7));
    }

    @GetMapping("/today")
    public ResponseEntity<List<DoseLogDTO>> getTodaysDoses(
            @RequestHeader("Authorization") String token) {
        return ResponseEntity.ok(doseTrackingService.getTodaysDoses(emailFrom(token)));
    }

    @PostMapping("/{doseId}/mark")
    public ResponseEntity<DoseLogDTO> markDose(
            @PathVariable Long doseId,
            @RequestParam String status,
            @RequestParam(required = false) String notes,
            @RequestHeader("Authorization") String token) {
        return ResponseEntity.ok(doseTrackingService.markDose(doseId, status, notes, emailFrom(token)));
    }

    @PostMapping("/{doseId}/snooze")
    public ResponseEntity<DoseLogDTO> snoozeDose(
            @PathVariable Long doseId,
            @RequestHeader("Authorization") String token) {
        return ResponseEntity.ok(doseTrackingService.snoozeDose(doseId, emailFrom(token)));
    }

    @GetMapping("/history")
    public ResponseEntity<List<DoseLogDTO>> getDoseHistory(
            @RequestHeader("Authorization") String token) {
        return ResponseEntity.ok(doseTrackingService.getDoseHistory(emailFrom(token)));
    }
}
