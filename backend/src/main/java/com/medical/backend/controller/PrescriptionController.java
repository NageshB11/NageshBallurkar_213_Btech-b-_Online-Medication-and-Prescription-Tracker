package com.medical.backend.controller;

import com.medical.backend.config.JwtUtil;
import com.medical.backend.entity.Prescription;
import com.medical.backend.entity.PrescriptionAudit;
import com.medical.backend.entity.User;
import com.medical.backend.repository.UserRepository;
import com.medical.backend.service.PrescriptionService;
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
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping
    public ResponseEntity<?> createPrescription(
            @RequestBody Prescription prescription,
            @RequestHeader("Authorization") String token) throws IOException {

        String jwt = token.substring(7);
        String email = jwtUtil.extractUsername(jwt);
        User doctor = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("Doctor not found"));

        if (!doctor.isVerified()) {
            return ResponseEntity.status(403).body("Unauthorized: Doctor account is pending verification.");
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
            @RequestParam String changeReason,
            @RequestParam String modifiedBy) throws IOException {

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

    @GetMapping("/{id}/audit")
    public ResponseEntity<List<PrescriptionAudit>> getAuditHistory(@PathVariable("id") Long id,
            @RequestHeader("Authorization") String token) {
        String jwt = token.substring(7);
        String email = jwtUtil.extractUsername(jwt);
        return ResponseEntity.ok(prescriptionService.getAuditHistory(id, email));
    }

    @PutMapping("/{id}/dispense")
    public ResponseEntity<Prescription> dispensePrescription(@PathVariable("id") Long id,
            @RequestHeader("Authorization") String token) throws IOException {
        String jwt = token.substring(7);
        String email = jwtUtil.extractUsername(jwt);
        return ResponseEntity.ok(prescriptionService.dispensePrescription(id, email));
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
}
