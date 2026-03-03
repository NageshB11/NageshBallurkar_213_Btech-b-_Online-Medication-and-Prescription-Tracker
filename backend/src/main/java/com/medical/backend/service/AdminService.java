package com.medical.backend.service;

import com.medical.backend.dto.SystemStatsDTO;
import com.medical.backend.dto.PatientAuditDTO;
import com.medical.backend.entity.Role;
import com.medical.backend.entity.User;
import com.medical.backend.entity.Prescription;
import com.medical.backend.entity.PrescriptionAudit;
import com.medical.backend.repository.PrescriptionRepository;
import com.medical.backend.repository.UserRepository;
import com.medical.backend.repository.SystemAuditRepository;
import com.medical.backend.repository.AdherenceLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.format.DateTimeFormatter;
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

        return new SystemStatsDTO(totalPatients, totalDoctors, totalPharmacists, totalPrescriptions,
                dispensedPrescriptions, activeUsers, dispensingRate, pharmacistPerformance, globalAdherence);
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
        return userRepository.findAll();
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

    /**
     * Returns a complete, grouped, delta-enriched audit timeline for a patient.
     * Groups by prescriptionId and sorts prescription groups by newest event desc.
     * Within each group, versions are sorted descending (newest first).
     * Delta is detected by comparing each version's clinical fields to the previous
     * one.
     */
    public List<PatientAuditDTO> getPatientAuditTimeline(Long patientId) {
        // 1. Fetch all prescriptions for this patient
        List<Prescription> patientPrescriptions = prescriptionRepository.findByPatient_Id(patientId);

        List<PatientAuditDTO> result = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        for (Prescription rx : patientPrescriptions) {
            // 2. Fetch all audit records for this prescription, sorted ASC (oldest first
            // for delta logic)
            List<PrescriptionAudit> audits = prescriptionAuditRepository
                    .findByPrescriptionIdOrderByModifiedAtAsc(rx.getId());

            if (audits.isEmpty())
                continue;

            PatientAuditDTO dto = new PatientAuditDTO();
            dto.setPrescriptionId(rx.getId());
            dto.setPatientName(rx.getPatient() != null ? rx.getPatient().getFullName() : "Unknown");

            // 3. Build version DTOs with delta detection (compare to previous)
            List<PatientAuditDTO.AuditVersionDTO> versions = new ArrayList<>();
            PatientAuditDTO.AuditVersionDTO prev = null;

            for (PrescriptionAudit audit : audits) {
                PatientAuditDTO.AuditVersionDTO v = new PatientAuditDTO.AuditVersionDTO();
                v.setAuditId(audit.getId());
                v.setVersionLabel(audit.getVersionLabel() != null ? audit.getVersionLabel() : "v1.0");
                v.setActionType(audit.getActionType());
                v.setPrescribedByName(audit.getPrescribedByName());
                v.setDispensedByName(audit.getDispensedByName());
                v.setMedicineName(audit.getMedicineName());
                v.setDosage(audit.getDosage());
                v.setDuration(audit.getDuration());
                v.setModifiedAt(audit.getModifiedAt() != null ? audit.getModifiedAt().format(fmt) : null);
                v.setModifiedBy(audit.getModifiedBy());
                v.setSnapshotJson(audit.getSnapshotJson());

                // Delta detection: compare clinical fields to previous version
                if (prev != null) {
                    boolean medChange = !Objects.equals(prev.getMedicineName(), audit.getMedicineName());
                    boolean dosChange = !Objects.equals(prev.getDosage(), audit.getDosage());
                    boolean durChange = !Objects.equals(prev.getDuration(), audit.getDuration());

                    if (medChange || dosChange || durChange) {
                        v.setHasDelta(true);
                        v.setPrevMedicineName(medChange ? prev.getMedicineName() : null);
                        v.setPrevDosage(dosChange ? prev.getDosage() : null);
                        v.setPrevDuration(durChange ? prev.getDuration() : null);
                    }
                }

                versions.add(v);
                prev = v;
            }

            // 4. Reverse to newest-first for the frontend
            Collections.reverse(versions);
            dto.setVersions(versions);
            result.add(dto);
        }

        // 5. Sort prescription groups: prescription with the most recent event first
        result.sort((a, b) -> {
            String aTime = a.getVersions().isEmpty() ? "" : a.getVersions().get(0).getModifiedAt();
            String bTime = b.getVersions().isEmpty() ? "" : b.getVersions().get(0).getModifiedAt();
            return bTime != null ? bTime.compareTo(aTime != null ? aTime : "") : -1;
        });

        return result;
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
}
