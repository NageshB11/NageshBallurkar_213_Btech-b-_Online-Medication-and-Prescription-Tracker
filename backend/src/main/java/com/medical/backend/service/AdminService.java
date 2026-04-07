package com.medical.backend.service;

import com.medical.backend.dto.SystemStatsDTO;
import com.medical.backend.dto.PatientAuditDTO;
import com.medical.backend.entity.AlertLog;
import com.medical.backend.entity.Role;
import com.medical.backend.entity.User;
import com.medical.backend.entity.Prescription;
import com.medical.backend.repository.AlertLogRepository;
import com.medical.backend.repository.PrescriptionRepository;
import com.medical.backend.repository.UserRepository;
import com.medical.backend.repository.SystemAuditRepository;
import com.medical.backend.repository.AdherenceLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @Autowired
    private com.medical.backend.repository.PrescriptionAuditRepository prescriptionAuditRepository;

    @Autowired
    private SystemAuditRepository systemAuditRepository;

    @Autowired
    private AdherenceLogRepository adherenceLogRepository;

    @Autowired
    private AlertLogRepository alertLogRepository;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @Autowired
    private com.medical.backend.repository.DoseLogRepository doseLogRepository;

    @Autowired
    private AdherenceService adherenceService;

    @PostConstruct
    public void seedAlertLogs() {
        if (alertLogRepository.count() == 0) {
            List<AlertLog> seeds = List.of(
                createAlert("New Doctor registration pending approval: Dr. Sarah Patel", "INFO", 2),
                createAlert("Patient #102 dropped below 30% adherence — critical risk", "ERROR", 5),
                createAlert("Stock level for Amoxicillin hit critical low (12 units remaining)", "WARNING", 8),
                createAlert("Database backup completed successfully", "INFO", 12),
                createAlert("System latency spike detected on /api/prescriptions endpoint", "WARNING", 18),
                createAlert("New Pharmacist registration: Velraj K. — awaiting verification", "INFO", 24),
                createAlert("Failed login attempt from unknown IP: 192.168.1.55", "ERROR", 30),
                createAlert("Prescription #45 dispensed after 48-hour SLA breach", "WARNING", 36),
                createAlert("Monthly compliance report generated for March 2026", "INFO", 48),
                createAlert("Patient #87 achieved 100% adherence this month — milestone", "INFO", 60),
                createAlert("SSL certificate renewal completed", "INFO", 72),
                createAlert("Stock level for Metformin approaching reorder threshold", "WARNING", 80),
                createAlert("System health check: All nodes operational", "INFO", 96),
                createAlert("Unauthorized access attempt blocked on /api/admin/users", "ERROR", 110),
                createAlert("Scheduled maintenance window completed — zero downtime", "INFO", 130)
            );
            alertLogRepository.saveAll(seeds);
        }
    }

    private AlertLog createAlert(String message, String severity, int hoursAgo) {
        AlertLog alert = new AlertLog();
        alert.setMessage(message);
        alert.setSeverity(severity);
        alert.setTimestamp(LocalDateTime.now().minusHours(hoursAgo));
        return alert;
    }

    public SystemStatsDTO getSystemStats() {
        long totalPatients = userRepository.countByRole(Role.PATIENT);
        long totalDoctors = userRepository.countByRole(Role.DOCTOR);
        long totalPharmacists = userRepository.countByRole(Role.PHARMACIST);
        long totalPrescriptions = prescriptionRepository.count();
        List<Prescription> dispensed = prescriptionRepository.findByStatus(Prescription.PrescriptionStatus.DISPENSED);
        long dispensedPrescriptions = dispensed.size();

        long activeUsers = totalPatients + totalDoctors + totalPharmacists;

        double dispensingRate = 0.0;
        if (totalPrescriptions > 0) {
            dispensingRate = (double) dispensedPrescriptions / totalPrescriptions * 100;
        }

        // Pharmacist Performance: Average hours to dispense
        Map<String, List<Long>> perfMap = new HashMap<>();
        for (Prescription p : dispensed) {
            if (p.getPharmacist() != null && p.getDispensedAt() != null) {
                long hours = Duration.between(p.getCreatedAt(), p.getDispensedAt()).toHours();
                perfMap.computeIfAbsent(p.getPharmacist().getFullName(), k -> new ArrayList<>()).add(hours);
            }
        }
        Map<String, Double> pharmacistPerformance = perfMap.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> e.getValue().stream().mapToLong(Long::longValue).average().orElse(0.0)));

        // Global Adherence
        List<Prescription> activeRx = prescriptionRepository.findAll().stream()
                .filter(p -> p.getStatus() == Prescription.PrescriptionStatus.ISSUED
                        || p.getStatus() == Prescription.PrescriptionStatus.DISPENSED
                        || p.getStatus() == Prescription.PrescriptionStatus.EXPIRED)
                .toList();

        long totalExpected = 0;
        long totalLogged = 0;

        for (Prescription p : activeRx) {
            totalExpected += calculateExpectedSoFar(p);
            totalLogged += adherenceLogRepository.findByPrescriptionId(p.getId()).size();
        }

        Map<String, Long> globalAdherence = new HashMap<>();
        globalAdherence.put("Success", totalLogged);
        globalAdherence.put("Missed", Math.max(0, totalExpected - totalLogged));

        // Pending Verifications Count
        long pendingVerificationsCount = userRepository.findAll().stream()
                .filter(u -> !u.isVerified() && (u.getRole() == Role.DOCTOR || u.getRole() == Role.PHARMACIST))
                .count();

        SystemStatsDTO dto = new SystemStatsDTO(totalPatients, totalDoctors, totalPharmacists, totalPrescriptions,
                dispensedPrescriptions, activeUsers, dispensingRate, pharmacistPerformance, globalAdherence, pendingVerificationsCount);

        // Attach the Alert Heartbeat Feed
        dto.setRecentAlerts(alertLogRepository.findTop20ByOrderByTimestampDesc());

        return dto;
    }

    private long calculateExpectedSoFar(Prescription p) {
        long total = 0;
        if (p.getItems() == null)
            return 0;
        for (com.medical.backend.entity.PrescriptionItem item : p.getItems()) {
            if (item.getStartDate() != null && item.getEndDate() != null) {
                java.time.LocalDateTime start = item.getStartDate().atStartOfDay();
                java.time.LocalDateTime end = item.getEndDate().atTime(23, 59);

                java.time.LocalDateTime effectiveEnd = end.isAfter(java.time.LocalDateTime.now())
                        ? java.time.LocalDateTime.now()
                        : end;

                long days = java.time.temporal.ChronoUnit.DAYS.between(start.toLocalDate(), effectiveEnd.toLocalDate());

                if (java.time.LocalDateTime.now().isAfter(end)) {
                    days = java.time.temporal.ChronoUnit.DAYS.between(start.toLocalDate(), end.toLocalDate()) + 1;
                }

                if (days < 0)
                    days = 0;

                String[] timings = item.getDosageTiming() != null ? item.getDosageTiming().split(",")
                        : new String[] { "Daily" };
                total += days * timings.length;
            }
        }
        return total;
    }

    public List<User> getAllUsers() {
        List<User> users = userRepository.findAll();
        for (User u : users) {
          if (com.medical.backend.entity.Role.PATIENT.equals(u.getRole())) {
            u.setAdherenceScore(adherenceService.calculatePatientAdherence(u.getId()));
          }
        }
        return users;
    }

    public List<User> getAllPatients() {
        return userRepository.findByRole(Role.PATIENT);
    }

    public List<com.medical.backend.entity.PrescriptionAudit> getAllAuditLogs() {
        return prescriptionAuditRepository.findAll();
    }

    public List<com.medical.backend.entity.SystemAudit> getSystemAuditLogs() {
        return systemAuditRepository.findAllByOrderByTimestampDesc();
    }

    public List<com.medical.backend.entity.PrescriptionAudit> getPrescriptionAuditLogs(Long prescriptionId) {
        return prescriptionAuditRepository.findByPrescriptionIdOrderByModifiedAtDesc(prescriptionId);
    }

    public List<com.medical.backend.entity.PrescriptionAudit> getAuditTrace(Long prescriptionId) {
        return prescriptionAuditRepository.findByPrescriptionIdOrderByModifiedAtAsc(prescriptionId);
    }

    @Autowired
    private PrescriptionService prescriptionService;

    public List<PatientAuditDTO> getPatientAuditTimeline(Long patientId) {
        return prescriptionService.getPatientAuditTimeline(patientId);
    }

    public User verifyUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setVerified(true);
        User saved = userRepository.save(user);

        com.medical.backend.entity.SystemAudit audit = new com.medical.backend.entity.SystemAudit();
        audit.setAction("USER_VERIFIED");
        audit.setDetails("Admin verified " + user.getRole() + ": " + user.getFullName() + " (" + user.getEmail() + ")");
        systemAuditRepository.save(audit);

        return saved;
    }

    public void rejectUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Log a Warning alert for compliance before deletion
        AlertLog alert = new AlertLog();
        alert.setMessage("SECURITY ALERT: Admin rejected and PERMANENTLY DELETED " + user.getRole() + ": " + user.getFullName() + " (" + user.getEmail() + ")");
        alert.setSeverity("WARNING");
        alert.setTimestamp(LocalDateTime.now());
        alertLogRepository.save(alert);

        com.medical.backend.entity.SystemAudit audit = new com.medical.backend.entity.SystemAudit();
        audit.setAction("USER_REJECTED");
        audit.setDetails("Admin rejected and removed " + user.getRole() + ": " + user.getFullName() + " (" + user.getEmail() + ")");
        systemAuditRepository.save(audit);

        userRepository.delete(user);
    }

    public User toggleUserStatus(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setActive(!user.isActive());
        User saved = userRepository.save(user);

        // System Audit Log
        com.medical.backend.entity.SystemAudit audit = new com.medical.backend.entity.SystemAudit();
        audit.setAction(saved.isActive() ? "USER_ACTIVATED" : "USER_SUSPENDED");
        audit.setDetails("Admin " + (saved.isActive() ? "activated " : "suspended ") + user.getRole() + ": " + user.getFullName() + " (" + user.getEmail() + ")");
        systemAuditRepository.save(audit);

        // Security Alert Log
        AlertLog alert = new AlertLog();
        alert.setMessage("SECURITY: User " + user.getFullName() + " (" + user.getEmail() + ") was " + (saved.isActive() ? "ACTIVATED" : "SUSPENDED") + " by Admin.");
        alert.setSeverity(saved.isActive() ? "INFO" : "WARNING");
        alert.setTimestamp(LocalDateTime.now());
        alertLogRepository.save(alert);

        return saved;
    }

    public User updatePatientDetails(Long userId, Map<String, String> details) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        boolean historyChanged = false;
        if (details.containsKey("medicalHistory")) {
            String oldHistory = user.getMedicalHistory();
            String newHistory = details.get("medicalHistory");
            if (!Objects.equals(oldHistory, newHistory)) {
                user.setMedicalHistory(newHistory);
                historyChanged = true;
            }
        }
        
        if (details.containsKey("phone")) user.setPhone(details.get("phone"));
        if (details.containsKey("address")) user.setAddress(details.get("address"));
        if (details.containsKey("fullName")) user.setFullName(details.get("fullName"));

        User saved = userRepository.save(user);

        if (historyChanged) {
            AlertLog alert = new AlertLog();
            alert.setMessage("CLINICAL: Medical history updated for Patient " + user.getFullName() + " (" + user.getEmail() + ") by Admin.");
            alert.setSeverity("INFO");
            alert.setTimestamp(LocalDateTime.now());
            alertLogRepository.save(alert);
        }

        return saved;
    }

    public User resetPassword(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        String tempPassword = "Reset123!";
        user.setPassword(passwordEncoder.encode(tempPassword));
        User saved = userRepository.save(user);

        // Security Alert Log
        AlertLog alert = new AlertLog();
        alert.setMessage("SECURITY: Admin reset password for " + user.getRole() + ": " + user.getFullName() + " (" + user.getEmail() + "). Default set to 'Reset123!'.");
        alert.setSeverity("WARNING");
        alert.setTimestamp(LocalDateTime.now());
        alertLogRepository.save(alert);

        return saved;
    }

    public Map<String, Object> getUserAuditTrace(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Ensure adherence is calculated for patients
        if (com.medical.backend.entity.Role.PATIENT.equals(user.getRole())) {
            user.setAdherenceScore(adherenceService.calculatePatientAdherence(user.getId()));
        }

        Map<String, Object> trace = new HashMap<>();
        trace.put("user", user);

        // Standardized history timeline
        List<Map<String, Object>> timeline = new ArrayList<>();

        // 1. System events from SystemAudit
        List<com.medical.backend.entity.SystemAudit> systemAudits = systemAuditRepository.findAll().stream()
                .filter(a -> a.getDetails().contains(user.getFullName()) || (user.getEmail() != null && a.getDetails().contains(user.getEmail())))
                .toList();
        
        for (com.medical.backend.entity.SystemAudit a : systemAudits) {
            Map<String, Object> event = new HashMap<>();
            event.put("timestamp", a.getTimestamp());
            event.put("action", a.getAction());
            event.put("details", a.getDetails());
            event.put("type", "SECURITY");
            timeline.add(event);
        }

        // 2. Business events from PrescriptionAudit
        if (user.getRole() == Role.PATIENT) {
            // Find all prescriptions for this patient
            List<Long> rxIds = prescriptionRepository.findAll().stream()
                .filter(p -> p.getPatient() != null && p.getPatient().getId().equals(user.getId()))
                .map(com.medical.backend.entity.Prescription::getId)
                .toList();
            
            if (!rxIds.isEmpty()) {
                List<com.medical.backend.entity.PrescriptionAudit> rxAudits = prescriptionAuditRepository.findAll().stream()
                    .filter(a -> rxIds.contains(a.getPrescriptionId()))
                    .toList();
                
                for (com.medical.backend.entity.PrescriptionAudit a : rxAudits) {
                    Map<String, Object> event = new HashMap<>();
                    event.put("timestamp", a.getModifiedAt());
                    event.put("action", a.getActionType());
                    event.put("details", "Prescription #" + a.getPrescriptionId() + " " + a.getActionType().toLowerCase() + " by " + a.getPrescribedByName());
                    event.put("type", "CLINICAL");
                    timeline.add(event);
                }
            }
        } else if (user.getRole() == Role.DOCTOR || user.getRole() == Role.PHARMACIST) {
            // For Doctors/Pharmacists, find audits where they were the actors
            List<com.medical.backend.entity.PrescriptionAudit> rxAudits = prescriptionAuditRepository.findAll().stream()
                .filter(a -> (a.getPrescribedById() != null && a.getPrescribedById().equals(user.getId())) || 
                            (a.getDispensedById() != null && a.getDispensedById().equals(user.getId())))
                .toList();
            
            for (com.medical.backend.entity.PrescriptionAudit a : rxAudits) {
                Map<String, Object> event = new HashMap<>();
                event.put("timestamp", a.getModifiedAt());
                event.put("action", a.getActionType());
                event.put("details", (user.getRole() == Role.DOCTOR ? "Issued/Modified" : "Dispensed") + " Prescription #" + a.getPrescriptionId());
                event.put("type", "CLINICAL");
                timeline.add(event);
            }
        }

        // Sort timeline by timestamp desc
        timeline.sort((a, b) -> ((java.time.LocalDateTime)b.get("timestamp")).compareTo((java.time.LocalDateTime)a.get("timestamp")));
        trace.put("timeline", timeline);

        return trace;
    }

    public void clearAllMedtrackData() {
        doseLogRepository.deleteAll();
        adherenceLogRepository.deleteAll();
        alertLogRepository.deleteAll();
        prescriptionAuditRepository.deleteAll();
        
        // Deleting prescriptions will delete items due to cascade usually, but let's be safe
        prescriptionRepository.deleteAll();
        
        com.medical.backend.entity.SystemAudit audit = new com.medical.backend.entity.SystemAudit();
        audit.setAction("SYSTEM_DATA_WIPE");
        audit.setDetails("Admin invoked full data wipe of prescriptions and logs.");
        systemAuditRepository.save(audit);
    }
}
