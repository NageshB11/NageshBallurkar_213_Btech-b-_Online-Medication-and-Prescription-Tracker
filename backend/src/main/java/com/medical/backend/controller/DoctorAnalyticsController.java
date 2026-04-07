package com.medical.backend.controller;

import com.medical.backend.dto.DoctorAnalyticsSummaryDTO;
import com.medical.backend.entity.User;
import com.medical.backend.repository.UserRepository;
import com.medical.backend.service.ClinicalAnalyticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/doctor")
@CrossOrigin(origins = "http://localhost:4200")
public class DoctorAnalyticsController {

    @Autowired
    private ClinicalAnalyticsService clinicalAnalyticsService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/analytics-summary")
    public ResponseEntity<DoctorAnalyticsSummaryDTO> getAnalyticsSummary() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            logError("403 REJECTED: Auth was null, not authenticated, or anonymous user.");
            return ResponseEntity.status(403).build();
        }

        User currentUser = userRepository.findByEmail(auth.getName()).orElse(null);

        if (currentUser == null || currentUser.getRole() != com.medical.backend.entity.Role.DOCTOR) {
            logError("403 REJECTED: Current User is null OR Role is not DOCTOR. User: " + (currentUser != null ? currentUser.getEmail() + " Role: " + currentUser.getRole() : "NULL"));
            return ResponseEntity.status(403).build();
        }

        try {
            DoctorAnalyticsSummaryDTO summary = clinicalAnalyticsService.getDoctorAnalyticsSummary(currentUser.getId());
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            logError("500 INTERNAL SERVER ERROR:");
            try {
                java.io.FileWriter fw = new java.io.FileWriter("C:\\Users\\ANSAF\\Music\\Project 1\\backend\\error_diagnostic.log", true);
                java.io.PrintWriter pw = new java.io.PrintWriter(fw);
                e.printStackTrace(pw);
                pw.close();
            } catch (Exception writingEx) {}
            return ResponseEntity.status(500).build();
        }
    }

    private void logError(String msg) {
        try {
            java.io.FileWriter fw = new java.io.FileWriter("C:\\Users\\ANSAF\\Music\\Project 1\\backend\\error_diagnostic.log", true);
            java.io.PrintWriter pw = new java.io.PrintWriter(fw);
            pw.println("--- DIAGNOSTIC LOG ---");
            pw.println(msg);
            pw.close();
        } catch (Exception ignored) {}
    }
}
