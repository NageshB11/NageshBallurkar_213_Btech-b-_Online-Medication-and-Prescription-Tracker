package com.medical.backend.controller;

import com.medical.backend.config.JwtUtil;
import com.medical.backend.entity.Prescription;
import com.medical.backend.entity.RenewalRequest;
import com.medical.backend.entity.User;
import com.medical.backend.repository.PrescriptionRepository;
import com.medical.backend.repository.RenewalRequestRepository;
import com.medical.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/renewals")
@CrossOrigin(origins = "*")
public class RenewalController {

    @Autowired
    private RenewalRequestRepository renewalRequestRepository;

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/request/{prescriptionId}")
    public ResponseEntity<?> requestRenewal(@RequestHeader("Authorization") String token,
            @PathVariable("prescriptionId") Long prescriptionId) {
        String email = jwtUtil.extractUsername(token.substring(7));
        User patient = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("Patient not found"));

        Prescription prescription = prescriptionRepository.findById(prescriptionId)
                .orElseThrow(() -> new RuntimeException("Prescription not found"));

        if (!prescription.getPatient().getId().equals(patient.getId())) {
            return ResponseEntity.status(403).body("Unauthorized access to this prescription");
        }

        RenewalRequest request = new RenewalRequest();
        request.setPatient(patient);
        request.setDoctor(prescription.getDoctor());
        request.setPrescription(prescription);

        renewalRequestRepository.save(request);

        return ResponseEntity.ok("Renewal requested successfully");
    }

    @GetMapping("/my")
    public ResponseEntity<List<RenewalRequest>> getMyRenewals(@RequestHeader("Authorization") String token) {
        String email = jwtUtil.extractUsername(token.substring(7));
        User patient = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("Patient not found"));

        return ResponseEntity.ok(renewalRequestRepository.findByPatientId(patient.getId()));
    }
}
