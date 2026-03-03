package com.medical.backend.controller;

import com.medical.backend.dto.SystemStatsDTO;
import com.medical.backend.dto.PatientAuditDTO;
import com.medical.backend.entity.User;
import com.medical.backend.entity.PrescriptionAudit;
import com.medical.backend.entity.SystemAudit;
import com.medical.backend.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @GetMapping("/stats")
    public ResponseEntity<SystemStatsDTO> getStats() {
        return ResponseEntity.ok(adminService.getSystemStats());
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @GetMapping("/audits")
    public ResponseEntity<List<PrescriptionAudit>> getAuditLogs() {
        return ResponseEntity.ok(adminService.getAllAuditLogs());
    }

    @GetMapping("/system-audits")
    public ResponseEntity<List<SystemAudit>> getSystemAuditLogs() {
        return ResponseEntity.ok(adminService.getSystemAuditLogs());
    }

    @GetMapping("/audit-logs/{prescriptionId}")
    public ResponseEntity<List<PrescriptionAudit>> getPrescriptionAuditLogs(
            @PathVariable("prescriptionId") Long prescriptionId) {
        return ResponseEntity.ok(adminService.getPrescriptionAuditLogs(prescriptionId));
    }

    @GetMapping("/prescription-trace/{prescriptionId}")
    public ResponseEntity<List<PrescriptionAudit>> getPrescriptionTrace(
            @PathVariable("prescriptionId") Long prescriptionId) {
        return ResponseEntity.ok(adminService.getAuditTrace(prescriptionId));
    }

    /** All PATIENT-role users — for the patient selector dropdown */
    @GetMapping("/patients")
    public ResponseEntity<List<User>> getAllPatients() {
        return ResponseEntity.ok(adminService.getAllPatients());
    }

    /** Full, grouped, delta-enriched audit timeline for a specific patient */
    @GetMapping("/audit/patient/{patientId}")
    public ResponseEntity<List<PatientAuditDTO>> getPatientAuditTimeline(
            @PathVariable("patientId") Long patientId) {
        return ResponseEntity.ok(adminService.getPatientAuditTimeline(patientId));
    }

    @PostMapping("/verify/{userId}")
    public ResponseEntity<User> verifyUser(@PathVariable("userId") Long userId) {
        return ResponseEntity.ok(adminService.verifyUser(userId));
    }
}
