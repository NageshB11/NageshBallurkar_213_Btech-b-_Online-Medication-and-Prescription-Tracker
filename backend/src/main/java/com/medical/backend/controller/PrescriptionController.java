package com.medical.backend.controller;

import com.medical.backend.config.JwtUtil;
import com.medical.backend.entity.Prescription;
import com.medical.backend.entity.PrescriptionAudit;
import com.medical.backend.entity.User;
import com.medical.backend.repository.UserRepository;
import com.medical.backend.service.PrescriptionService;
import com.medical.backend.dto.PatientAuditDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/prescriptions")
@CrossOrigin(origins = "http://localhost:4200")
public class PrescriptionController {

    @Autowired
    private PrescriptionService prescriptionService;

    @Autowired
    private com.medical.backend.repository.DoseLogRepository doseLogRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private com.medical.backend.service.AdherenceAlertService adherenceAlertService;

    @PostMapping
    public ResponseEntity<?> createPrescription(
            @RequestBody Prescription prescription,
            @RequestHeader("Authorization") String token) throws IOException {

        String jwt = token.substring(7);
        String email = jwtUtil.extractUsername(jwt);
        User doctor = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("Doctor not found"));

            if (!doctor.isVerified()) {
                System.out.println("[AUTH] Unverified doctor attempted to create prescription: " + email);
                return ResponseEntity.status(403).body("Unauthorized: Doctor account is pending verification.");
            }

            prescription.setDoctor(doctor);
            System.out.println("[DEBUG] Creating prescription for patient: " + prescription.getPatientEmail());

            return ResponseEntity.ok(prescriptionService.createPrescription(prescription));
        } catch (com.medical.backend.exception.ClinicalSafetyException e) {
            throw e; // Let GlobalExceptionHandler handle it and return the full SafetyReportDTO
        } catch (Exception e) {
            System.err.println("[ERROR] Failed to create prescription: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                    "message",
                    "Failed to create prescription: "
                            + (e.getMessage() != null ? e.getMessage() : e.getClass().getName()),
                    "error", e.getClass().getSimpleName()));
        }

        prescription.setDoctor(doctor);

        return ResponseEntity.ok(prescriptionService.createPrescription(prescription));
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadPrescription(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file,
            @RequestParam(value = "patientEmail", required = false) String patientEmail,
            @RequestHeader("Authorization") String token) throws IOException {

        String jwt = token.substring(7);
        String doctorEmail = jwtUtil.extractUsername(jwt);
        User doctor = userRepository.findByEmail(doctorEmail)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));

        if (!doctor.isVerified()) {
            return ResponseEntity.status(403).body("Unauthorized: Doctor account is pending verification.");
        }

        return ResponseEntity.ok(prescriptionService.uploadPrescription(file, patientEmail, doctorEmail));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Prescription> updatePrescription(
            @PathVariable("id") Long id,
            @RequestBody Prescription prescription,
            @RequestParam("changeReason") String changeReason,
            @RequestParam("modifiedBy") String modifiedBy) throws IOException {

        return ResponseEntity.ok(prescriptionService.updatePrescription(id, prescription, changeReason, modifiedBy));
    }

    @PostMapping("/{id}/validate")
    public ResponseEntity<?> validatePrescription(@PathVariable("id") Long id,
            @RequestParam(required = false) Long pharmacistId) {
        try {
            return ResponseEntity.ok(prescriptionService.validatePrescription(id, pharmacistId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(400).body(e.getMessage());
        }
    }

    @PostMapping("/validate-item")
    public ResponseEntity<?> validateItem(
            @RequestParam("drugName") String drugName,
            @RequestParam("patientEmail") String patientEmail) {
        try {
            prescriptionService.validatePrescriptionItem(drugName, patientEmail);
            return ResponseEntity.ok(Map.of("message", "Medication is safe for this patient."));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of(
                    "message", e.getMessage() != null ? e.getMessage() : "Safety validation failed",
                    "error", e.getClass().getSimpleName()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Prescription> getPrescription(@PathVariable("id") Long id,
            @RequestHeader("Authorization") String token) {
        String jwt = token.substring(7);
        String email = jwtUtil.extractUsername(jwt);
        return ResponseEntity.ok(prescriptionService.getPrescription(id, email));
    }

    @GetMapping("/my-prescriptions")
    public ResponseEntity<List<Prescription>> getMyPrescriptions(@RequestHeader("Authorization") String token) {
        String jwt = token.substring(7);
        String email = jwtUtil.extractUsername(jwt);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(prescriptionService.getPrescriptionsByPatientId(user.getId()));
    }

    @GetMapping("/issued")
    public ResponseEntity<List<Prescription>> getIssuedPrescriptions(@RequestHeader("Authorization") String token) {
        String jwt = token.substring(7);
        String email = jwtUtil.extractUsername(jwt);
        User doctor = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));

        return ResponseEntity.ok(prescriptionService.getPrescriptionsByDoctorId(doctor.getId()));
    }

    @GetMapping("/my-audit-timeline")
    public ResponseEntity<List<PatientAuditDTO>> getMyAuditTimeline(@RequestHeader("Authorization") String token) {
        String jwt = token.substring(7);
        String email = jwtUtil.extractUsername(jwt);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(prescriptionService.getPatientAuditTimeline(user.getId()));
    }

    @GetMapping("/{id}/audit")
    public ResponseEntity<List<PrescriptionAudit>> getAuditHistory(@PathVariable("id") Long id,
            @RequestHeader("Authorization") String token) {
        String jwt = token.substring(7);
        String email = jwtUtil.extractUsername(jwt);
        return ResponseEntity.ok(prescriptionService.getAuditHistory(id, email));
    }

    @PutMapping("/{id}/dispense")
    public ResponseEntity<Prescription> dispensePrescription(@PathVariable("id") Long id,
            @RequestParam(value = "cost", required = false) Double cost,
            @RequestHeader("Authorization") String token) throws IOException {
        String jwt = token.substring(7);
        String email = jwtUtil.extractUsername(jwt);
        return ResponseEntity.ok(prescriptionService.dispensePrescription(id, email, cost));
    }

    @GetMapping("/pharmacist-queue")
    public ResponseEntity<List<Prescription>> getPharmacistQueue(@RequestHeader("Authorization") String token) {
        String jwt = token.substring(7);
        String email = jwtUtil.extractUsername(jwt);
        return ResponseEntity.ok(prescriptionService.getPrescriptionsForPharmacist(email));
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<org.springframework.core.io.Resource> downloadPrescription(@PathVariable("id") Long id,
            @RequestHeader("Authorization") String token) {
        String jwt = token.substring(7);
        String email = jwtUtil.extractUsername(jwt);

        org.springframework.core.io.Resource resource = prescriptionService.getPrescriptionFile(id, email);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<Prescription> publishPrescription(@PathVariable("id") Long id) throws IOException {
        return ResponseEntity.ok(prescriptionService.publishPrescription(id));
    }

    @GetMapping("/analytics")
    public ResponseEntity<com.medical.backend.dto.DoctorAnalyticsDTO> getMyAnalytics(
            @RequestHeader("Authorization") String token) {
        String jwt = token.substring(7);
        String email = jwtUtil.extractUsername(jwt);
        User doctor = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("Doctor not found"));

        return ResponseEntity.ok(prescriptionService.getDoctorAnalytics(doctor.getId()));
    }

    @GetMapping("/patients")
    public ResponseEntity<List<User>> getMyPatients(@RequestHeader("Authorization") String token) {
        String jwt = token.substring(7);
        String email = jwtUtil.extractUsername(jwt);
        User doctor = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("Doctor not found"));

        return ResponseEntity.ok(prescriptionService.getMyPatients(doctor.getId()));
    }

    @GetMapping("/patients/{patientId}/prescriptions")
    public ResponseEntity<List<Prescription>> getPatientPrescriptions(
            @PathVariable("patientId") Long patientId,
            @RequestHeader("Authorization") String token) {
        // ideally check if doctor has access to this patient, for now allowed
        return ResponseEntity.ok(prescriptionService.getPrescriptionsByPatientId(patientId));
    }

    @GetMapping("/admin/doctors")
    public ResponseEntity<List<User>> getAllDoctors() {
        return ResponseEntity.ok(userRepository.findByRole(com.medical.backend.entity.Role.DOCTOR));
    }

    @GetMapping("/admin/doctors/{id}/prescriptions")
    public ResponseEntity<List<Prescription>> getDoctorPrescriptions(@PathVariable Long id) {
        return ResponseEntity.ok(prescriptionService.getPrescriptionsByDoctorId(id));
    }

    @GetMapping("/{id}/adherence")
    public ResponseEntity<Map<String, Object>> getAdherence(@PathVariable Long id) {
        long total = doseLogRepository.countByPrescriptionId(id);
        
        // Self-healing: if no logs exist, generate them for active/dispensed prescriptions
        if (total == 0) {
            Prescription p = prescriptionService.getPrescription(id);
            if (p != null && (p.getStatus() != com.medical.backend.entity.Prescription.PrescriptionStatus.EXPIRED)) {
                prescriptionService.generateDoseMatrix(p);
                total = doseLogRepository.countByPrescriptionId(id);
            }
        }

        long taken = doseLogRepository.countByPrescriptionIdAndIsTakenTrue(id);
        double percentage = (total == 0) ? 0 : (double) taken / total * 100;

        List<com.medical.backend.entity.DoseLog> logs = doseLogRepository.findByPrescriptionIdOrderByDateAscMealAsc(id);

        Map<String, Object> response = new java.util.HashMap<>();
        response.put("prescriptionId", id);
        response.put("adherencePercentage", Math.round(percentage * 10) / 10.0);
        response.put("totalDoses", total);
        response.put("takenDoses", taken);
        response.put("logs", logs);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/doselog/{logId}/take")
    public ResponseEntity<com.medical.backend.entity.DoseLog> takeDose(
            @PathVariable Long logId,
            @RequestParam(value = "status", defaultValue = "true") boolean status) {
        com.medical.backend.entity.DoseLog log = doseLogRepository.findById(logId)
                .orElseThrow(() -> new RuntimeException("Dose log not found"));
        
        // Quota Guard: Strict one-time click enforcement
        if (log.isTaken() && status) {
            throw new IllegalStateException("Slot already logged");
        }

        log.setTaken(status);
        if (status) {
            log.setTakenAt(java.time.LocalDateTime.now());
            log.setActualTime(java.time.LocalDateTime.now());
        }
        
        com.medical.backend.entity.DoseLog saved = doseLogRepository.save(log);
        
        // Asynchronous (Fire-and-forget) check for doctor alert
        if (status && saved.getPrescriptionId() != null) {
            adherenceAlertService.checkAndNotifyDoctor(saved.getPrescriptionId());
        }
        
        return ResponseEntity.ok(saved);
    }
}
