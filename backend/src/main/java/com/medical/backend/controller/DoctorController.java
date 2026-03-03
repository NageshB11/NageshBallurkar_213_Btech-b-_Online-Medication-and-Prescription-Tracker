package com.medical.backend.controller;

import com.medical.backend.config.JwtUtil;
import com.medical.backend.entity.User;
import com.medical.backend.repository.UserRepository;
import com.medical.backend.service.PrescriptionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doctor")
@CrossOrigin(origins = "http://localhost:4200")
public class DoctorController {

    @Autowired
    private PrescriptionService prescriptionService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @GetMapping("/patients")
    public ResponseEntity<List<User>> getMyPatients(@RequestHeader("Authorization") String token) {
        String email = jwtUtil.extractUsername(token.substring(7));
        User doctor = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("Doctor not found"));
        return ResponseEntity.ok(prescriptionService.getMyPatients(doctor.getId()));
    }

    @GetMapping("/all")
    public ResponseEntity<List<User>> getAllDoctors() {
        List<User> doctors = userRepository.findByRole(com.medical.backend.entity.Role.DOCTOR);
        return ResponseEntity.ok(doctors);
    }

    @GetMapping("/analytics")
    public ResponseEntity<com.medical.backend.dto.DoctorAnalyticsDTO> getMyAnalytics(
            @RequestHeader("Authorization") String token) {
        String email = jwtUtil.extractUsername(token.substring(7));
        User doctor = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("Doctor not found"));
        return ResponseEntity.ok(prescriptionService.getDoctorAnalytics(doctor.getId()));
    }

    @Autowired
    private com.medical.backend.service.RiskService riskService;

    @Autowired
    private com.medical.backend.repository.RenewalRequestRepository renewalRequestRepository;

    @GetMapping("/patients/risk")
    public ResponseEntity<List<com.medical.backend.dto.PatientRiskDTO>> getPatientsByRisk(
            @RequestHeader("Authorization") String token) {
        String email = jwtUtil.extractUsername(token.substring(7));
        User doctor = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("Doctor not found"));
        return ResponseEntity.ok(riskService.getPatientsByRisk(doctor.getId()));
    }

    @GetMapping("/renewals")
    public ResponseEntity<List<com.medical.backend.entity.RenewalRequest>> getRenewalRequests(
            @RequestHeader("Authorization") String token) {
        String email = jwtUtil.extractUsername(token.substring(7));
        User doctor = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("Doctor not found"));
        return ResponseEntity.ok(renewalRequestRepository.findByDoctorIdAndStatus(doctor.getId(),
                com.medical.backend.entity.RenewalRequest.RequestStatus.PENDING));
    }

    @PostMapping("/renewals/{id}/{status}")
    public ResponseEntity<?> updateRenewalStatus(@PathVariable("id") Long id, @PathVariable("status") String status,
            @RequestBody(required = false) String comments) {
        com.medical.backend.entity.RenewalRequest request = renewalRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        try {
            request.setStatus(com.medical.backend.entity.RenewalRequest.RequestStatus.valueOf(status.toUpperCase()));
            if (comments != null)
                request.setDoctorComments(comments);
            renewalRequestRepository.save(request);

            // If Approved, we might want to trigger prescription creation logic or
            // notification
            // For now just status update

            return ResponseEntity.ok("Renewal status updated");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid status");
        }
    }
}
