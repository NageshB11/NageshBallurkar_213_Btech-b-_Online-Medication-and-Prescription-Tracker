package com.medical.backend.controller;

import com.medical.backend.config.JwtUtil;
import com.medical.backend.dto.MedScheduleDTO;
import com.medical.backend.entity.MedicationSchedule;
import com.medical.backend.entity.PatientMealPrefs;
import com.medical.backend.entity.ScheduleAudit;
import com.medical.backend.service.MedScheduleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/schedules")
@CrossOrigin(origins = "http://localhost:4200")
public class MedScheduleController {

    @Autowired
    private MedScheduleService scheduleService;
    @Autowired
    private JwtUtil jwtUtil;

    private String emailFrom(String token) {
        return jwtUtil.extractUsername(token.substring(7));
    }

    // ── Meal Prefs ────────────────────────────────────────────────────

    @GetMapping("/meal-prefs")
    public ResponseEntity<PatientMealPrefs> getMealPrefs(
            @RequestHeader("Authorization") String token) {
        return ResponseEntity.ok(scheduleService.getMealPrefs(emailFrom(token)));
    }

    @PostMapping("/meal-prefs")
    public ResponseEntity<PatientMealPrefs> saveMealPrefs(
            @RequestHeader("Authorization") String token,
            @RequestBody PatientMealPrefs prefs) {
        return ResponseEntity.ok(scheduleService.saveMealPrefs(emailFrom(token), prefs));
    }

    // ── Schedule CRUD ─────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<MedicationSchedule> createSchedule(
            @RequestHeader("Authorization") String token,
            @RequestBody MedScheduleDTO req) {
        return ResponseEntity.ok(scheduleService.createSchedule(emailFrom(token), req));
    }

    @GetMapping("/my")
    public ResponseEntity<List<MedicationSchedule>> getMySchedules(
            @RequestHeader("Authorization") String token) {
        return ResponseEntity.ok(scheduleService.getMySchedules(emailFrom(token)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedicationSchedule> getSchedule(
            @PathVariable Long id,
            @RequestHeader("Authorization") String token) {
        return ResponseEntity.ok(scheduleService.getScheduleById(id, emailFrom(token)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<MedicationSchedule> updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestHeader("Authorization") String token) {
        return ResponseEntity.ok(scheduleService.updateStatus(id, status, emailFrom(token)));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<MedicationSchedule>> getPatientSchedules(
            @PathVariable Long patientId) {
        return ResponseEntity.ok(scheduleService.getSchedulesByPatientId(patientId));
    }

    // ── Audit ─────────────────────────────────────────────────────────

    @GetMapping("/{id}/audit")
    public ResponseEntity<List<ScheduleAudit>> getAudit(
            @PathVariable Long id,
            @RequestHeader("Authorization") String token) {
        return ResponseEntity.ok(scheduleService.getAuditTrail(id));
    }
}
