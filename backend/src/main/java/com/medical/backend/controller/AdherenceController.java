package com.medical.backend.controller;

import com.medical.backend.entity.AdherenceLog;
import com.medical.backend.service.AdherenceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/adherence")
@CrossOrigin(origins = "http://localhost:4200")
public class AdherenceController {

    @Autowired
    private AdherenceService adherenceService;

    @PostMapping("/log")
    public ResponseEntity<AdherenceLog> logAdherence(@RequestBody Map<String, Long> request) {
        Long patientId = request.get("patientId");
        Long prescriptionId = request.get("prescriptionId");
        return ResponseEntity.ok(adherenceService.logAdherence(patientId, prescriptionId));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<AdherenceLog>> getPatientLogs(@PathVariable("patientId") Long patientId) {
        return ResponseEntity.ok(adherenceService.getLogsByPatient(patientId));
    }

    @GetMapping("/patient/{patientId}/score")
    public ResponseEntity<Map<String, Object>> getPatientAdherenceScore(@PathVariable("patientId") Long patientId) {
        double score = adherenceService.calculatePatientAdherence(patientId);
        return ResponseEntity.ok(Map.of("score", score, "patientId", patientId));
    }
}
