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

import org.springframework.security.access.prepost.PreAuthorize;
import com.medical.backend.service.AuditReportingService;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @Autowired
    private AuditReportingService auditReportingService;

    @Autowired
    private com.medical.backend.service.AdminAnalyticsService adminAnalyticsService;

    @GetMapping("/stats")
    public ResponseEntity<SystemStatsDTO> getStats() {
        return ResponseEntity.ok(adminService.getSystemStats());
    }

    @GetMapping("/census")
    public ResponseEntity<java.util.Map<String, Object>> getPlatformCensus() {
        return ResponseEntity.ok(adminAnalyticsService.getPlatformCensus());
    }

    @GetMapping("/reports/export")
    public ResponseEntity<byte[]> exportAuditReport(
            @RequestParam(value = "type", defaultValue = "AUDIT") String type,
            @RequestParam(value = "start", required = false) String start,
            @RequestParam(value = "end", required = false) String end) {
        
        byte[] pdfBytes;
        String filename;

        if ("DISBURSEMENT".equalsIgnoreCase(type)) {
            pdfBytes = auditReportingService.generateDisbursementReport(start, end);
            filename = "Pharmacy_Disbursement_Report.pdf";
        } else {
            pdfBytes = auditReportingService.generateAuditReport(start, end);
            filename = "Official_Audit_Report.pdf";
        }
        
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.setContentType(org.springframework.http.MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("filename", filename);
        
        return new ResponseEntity<>(pdfBytes, headers, org.springframework.http.HttpStatus.OK);
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

    @DeleteMapping("/reject/{userId}")
    public ResponseEntity<Void> rejectUser(@PathVariable("userId") Long userId) {
        adminService.rejectUser(userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/users/{userId}/toggle-status")
    public ResponseEntity<User> toggleUserStatus(@PathVariable("userId") Long userId) {
        return ResponseEntity.ok(adminService.toggleUserStatus(userId));
    }

    @PutMapping("/users/{userId}/update-profile")
    public ResponseEntity<User> updatePatientDetails(@PathVariable("userId") Long userId, @RequestBody java.util.Map<String, String> details) {
        return ResponseEntity.ok(adminService.updatePatientDetails(userId, details));
    }
    @PostMapping("/users/{userId}/reset-password")
    public ResponseEntity<User> resetPassword(@PathVariable("userId") Long userId) {
        return ResponseEntity.ok(adminService.resetPassword(userId));
    }
    @GetMapping("/users/{userId}/audit-trace")
    public ResponseEntity<java.util.Map<String, Object>> getUserAuditTrace(@PathVariable("userId") Long userId) {
        return ResponseEntity.ok(adminService.getUserAuditTrace(userId));
    }

    @PostMapping("/system/clear-all-data")
    public ResponseEntity<Void> clearAllData() {
        adminService.clearAllMedtrackData();
        return ResponseEntity.ok().build();
    }
}
