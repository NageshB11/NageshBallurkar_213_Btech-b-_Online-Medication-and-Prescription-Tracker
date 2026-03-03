package com.medical.backend.controller;

import com.medical.backend.entity.Prescription;
import com.medical.backend.service.PharmacistService;
import com.medical.backend.repository.UserRepository;
import com.medical.backend.entity.User;
import com.medical.backend.entity.Role;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pharmacist")
@CrossOrigin(origins = "*") // Or specific frontend URL
public class PharmacistController {

    @Autowired
    private PharmacistService pharmacistService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/all")
    public ResponseEntity<java.util.List<User>> getAllPharmacists() {
        return ResponseEntity.ok(userRepository.findByRole(Role.PHARMACIST));
    }

    @GetMapping("/prescriptions/{id}")
    public ResponseEntity<?> getPrescription(@PathVariable("id") Long id) {
        try {
            Prescription p = pharmacistService.getPrescriptionForDispensing(id);
            return ResponseEntity.ok(p);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<?> getPrescriptionsByPatient(@PathVariable("patientId") Long patientId) {
        return ResponseEntity.ok(pharmacistService.getPrescriptionsForPatient(patientId));
    }

    @PatchMapping("/accept/{id}")
    public ResponseEntity<?> acceptPrescription(@PathVariable("id") Long id, Authentication authentication) {
        try {
            String pharmacistEmail = authentication.getName();
            Prescription p = pharmacistService.acceptPrescription(id, pharmacistEmail);
            return ResponseEntity.ok(p);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/dispense/{id}")
    public ResponseEntity<?> dispensePrescription(@PathVariable("id") Long id, Authentication authentication) {
        try {
            String pharmacistEmail = authentication.getName();
            Prescription p = pharmacistService.dispensePrescription(id, pharmacistEmail);
            return ResponseEntity.ok(p);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/prescriptions/{id}/clarification")
    public ResponseEntity<?> requestClarification(@PathVariable("id") Long id, @RequestBody String reason,
            Authentication authentication) {
        try {
            String pharmacistEmail = authentication.getName();
            pharmacistService.requestClarification(id, pharmacistEmail, reason);
            return ResponseEntity.ok("Clarification request sent to doctor");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
