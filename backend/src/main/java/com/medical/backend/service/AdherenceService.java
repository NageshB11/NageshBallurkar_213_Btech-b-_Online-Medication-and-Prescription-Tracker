package com.medical.backend.service;

import com.medical.backend.entity.AdherenceLog;
import com.medical.backend.entity.Prescription;
import com.medical.backend.entity.User;
import com.medical.backend.repository.AdherenceLogRepository;
import com.medical.backend.repository.PrescriptionRepository;
import com.medical.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class AdherenceService {

    @Autowired
    private AdherenceLogRepository adherenceLogRepository;

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    public AdherenceLog logAdherence(Long patientId, Long prescriptionId) {
        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        Prescription prescription = prescriptionRepository.findById(prescriptionId)
                .orElseThrow(() -> new RuntimeException("Prescription not found"));

        if (!prescription.getPatient().getId().equals(patientId)) {
            throw new RuntimeException("Prescription does not belong to patient");
        }

        AdherenceLog log = new AdherenceLog();
        log.setPatient(patient);
        log.setPrescription(prescription);
        log.setLogDate(LocalDateTime.now());

        AdherenceLog savedLog = adherenceLogRepository.save(log);

        // Check if 100% adherence reached
        double percentage = calculateAdherencePercentage(prescriptionId);
        if (percentage >= 100.0 && prescription.getDoctor() != null) {
            notificationService.createNotification(
                    prescription.getDoctor(),
                    "Treatment for patient " + patient.getFullName() + " (Prescription #" + prescriptionId
                            + ") has been Successfully Completed with 100% adherence.",
                    "TREATMENT_COMPLETED");
        }

        return savedLog;
    }

    public double calculateAdherencePercentage(Long prescriptionId) {
        Prescription prescription = prescriptionRepository.findById(prescriptionId)
                .orElseThrow(() -> new RuntimeException("Prescription not found"));

        long loggedDoses = adherenceLogRepository.findByPrescriptionId(prescriptionId).size();
        long totalDosesRequested = calculateTotalDoses(prescription);

        if (totalDosesRequested == 0)
            return 0;
        return Math.min(100.0, (double) loggedDoses / totalDosesRequested * 100.0);
    }

    public double calculatePatientAdherence(Long patientId) {
        List<Prescription> prescriptions = prescriptionRepository.findByPatientId(patientId);
        if (prescriptions.isEmpty())
            return 100.0; // Assume perfect if no active rx

        long totalExpected = 0;
        long totalLogged = 0;

        for (Prescription p : prescriptions) {
            if (p.getStatus() == Prescription.PrescriptionStatus.ISSUED
                    || p.getStatus() == Prescription.PrescriptionStatus.DISPENSED
                    || p.getStatus() == Prescription.PrescriptionStatus.EXPIRED) {
                totalExpected += calculateTotalDoses(p);
                totalLogged += adherenceLogRepository.findByPrescriptionId(p.getId()).size();
            }
        }

        if (totalExpected == 0)
            return 100.0;
        return Math.min(100.0, (double) totalLogged / totalExpected * 100.0);
    }

    private long calculateTotalDoses(Prescription prescription) {
        long total = 0;
        if (prescription.getItems() == null)
            return 0;
        for (com.medical.backend.entity.PrescriptionItem item : prescription.getItems()) {
            if (item.getStartDate() != null && item.getEndDate() != null) {
                LocalDateTime start = item.getStartDate().atStartOfDay();
                LocalDateTime end = item.getEndDate().atTime(23, 59);

                LocalDateTime effectiveEnd = end.isAfter(LocalDateTime.now()) ? LocalDateTime.now() : end;

                // Calculate only fully completed days to prevent unexpected drops in adherence
                // at midnight
                long daysSoFar = ChronoUnit.DAYS.between(start.toLocalDate(), effectiveEnd.toLocalDate());

                // If the prescription is completely finished, include the last day
                if (LocalDateTime.now().isAfter(end)) {
                    daysSoFar = ChronoUnit.DAYS.between(start.toLocalDate(), end.toLocalDate()) + 1;
                }

                if (daysSoFar < 0)
                    daysSoFar = 0;

                String[] timings = item.getDosageTiming() != null ? item.getDosageTiming().split(",")
                        : new String[] { "Daily" };
                total += daysSoFar * timings.length;
            }
        }
        return total;
    }

    public List<AdherenceLog> getLogsByPatient(Long patientId) {
        return adherenceLogRepository.findByPatientId(patientId);
    }

    public List<AdherenceLog> getLogsByPrescription(Long prescriptionId) {
        return adherenceLogRepository.findByPrescriptionId(prescriptionId);
    }

    @org.springframework.scheduling.annotation.Scheduled(cron = "0 0 0 * * *")
    public void checkMissingDoses() {
        LocalDateTime yesterday = LocalDateTime.now().minusHours(24);
        List<Prescription> activePrescriptions = prescriptionRepository.findAll().stream()
                .filter(p -> p.getStatus() == Prescription.PrescriptionStatus.DISPENSED)
                .toList();

        for (Prescription p : activePrescriptions) {
            long actualLogsLast24h = adherenceLogRepository.findByPrescriptionId(p.getId()).stream()
                    .filter(log -> log.getLogDate().isAfter(yesterday))
                    .count();

            long expectedDosesLast24h = calculateExpectedDosesInPeriod(p, yesterday, LocalDateTime.now());

            if (actualLogsLast24h < expectedDosesLast24h && p.getDoctor() != null) {
                notificationService.createNotification(
                        p.getDoctor(),
                        "CRITICAL ADHERENCE ALERT: Patient "
                                + (p.getPatient() != null ? p.getPatient().getFullName() : "Unknown") +
                                " missed " + (expectedDosesLast24h - actualLogsLast24h) + " doses for Prescription #"
                                + p.getId() + " in the last 24h.",
                        "ADHERENCE_GAP_ALERT");
            }
        }
    }

    private long calculateExpectedDosesInPeriod(Prescription p, LocalDateTime start, LocalDateTime end) {
        long expected = 0;
        if (p.getItems() == null)
            return 0;
        for (com.medical.backend.entity.PrescriptionItem item : p.getItems()) {
            if (item.getStartDate() != null && item.getEndDate() != null) {
                LocalDateTime itemStart = item.getStartDate().atStartOfDay();
                LocalDateTime itemEnd = item.getEndDate().atTime(23, 59);
                // Overlap of [itemStart, itemEnd] and [start, end]
                LocalDateTime rangeStart = start.isAfter(itemStart) ? start : itemStart;
                LocalDateTime rangeEnd = end.isBefore(itemEnd) ? end : itemEnd;

                if (rangeStart.isBefore(rangeEnd)) {
                    long days = ChronoUnit.DAYS.between(rangeStart, rangeEnd) + 1;
                    String[] timings = item.getDosageTiming() != null ? item.getDosageTiming().split(",")
                            : new String[] { "Daily" };
                    expected += days * timings.length;
                }
            }
        }
        return expected;
    }
}
