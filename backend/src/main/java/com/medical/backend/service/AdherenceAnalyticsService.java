package com.medical.backend.service;

import com.medical.backend.dto.AdherenceDataPoint;
import com.medical.backend.entity.DoseLog;
import com.medical.backend.entity.User;
import com.medical.backend.repository.AdherenceLogRepository;
import com.medical.backend.repository.DoseLogRepository;
import com.medical.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdherenceAnalyticsService {

    @Autowired
    private DoseLogRepository doseLogRepository;

    @Autowired
    private AdherenceLogRepository adherenceLogRepository;

    @Autowired
    private UserRepository userRepository;

    public List<AdherenceDataPoint> getAdherenceTrend(Long patientId, Integer month, Integer year) {
        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        List<DoseLog> doseLogs = doseLogRepository.findByPatientOrderByScheduledTimeDesc(patient);
        List<com.medical.backend.entity.AdherenceLog> simpleLogs = adherenceLogRepository.findByPatientId(patientId);

        if (doseLogs.isEmpty() && simpleLogs.isEmpty()) {
            return Collections.emptyList();
        }

        LocalDate today = LocalDate.now();
        int targetYear = (year != null) ? year : today.getYear();
        int targetMonth = (month != null) ? month : today.getMonthValue();
        
        YearMonth yearMonth = YearMonth.of(targetYear, targetMonth);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();
        
        // If the requested month is in the future relative to today, return empty
        if (startDate.isAfter(today)) {
            return Collections.emptyList();
        }

        // If the requested month is the current month, only plot up to today to prevent 0% flatlines for the rest of the month
        if (yearMonth.equals(YearMonth.now())) {
            endDate = today;
        }

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        // Group PoseLogs by date
        Map<String, List<DoseLog>> doseLogsByDate = doseLogs.stream()
                .filter(l -> !l.getScheduledTime().toLocalDate().isBefore(startDate))
                .collect(Collectors.groupingBy(log -> log.getScheduledTime().toLocalDate().format(formatter)));

        // Group SimpleLogs by date
        Map<String, List<com.medical.backend.entity.AdherenceLog>> simpleLogsByDate = simpleLogs.stream()
                .filter(l -> !l.getLogDate().toLocalDate().isBefore(startDate))
                .collect(Collectors.groupingBy(log -> log.getLogDate().toLocalDate().format(formatter)));

        List<AdherenceDataPoint> trend = new ArrayList<>();
        long span = ChronoUnit.DAYS.between(startDate, endDate);

        for (int i = 0; i <= span; i++) {
            LocalDate currentDate = startDate.plusDays(i);
            String dateStr = currentDate.format(formatter);

            List<DoseLog> dailyDoseLogs = doseLogsByDate.getOrDefault(dateStr, Collections.emptyList());
            List<com.medical.backend.entity.AdherenceLog> dailySimpleLogs = simpleLogsByDate.getOrDefault(dateStr, Collections.emptyList());

            if (dailyDoseLogs.isEmpty() && dailySimpleLogs.isEmpty()) {
                // No logs recorded this day, return 0.0% adherence to ensure graph plots correctly
                trend.add(new AdherenceDataPoint(dateStr, 0.0));
                continue;
            }

            // Calculation logic:
            // For DoseLogs: Adherence = TAKEN / Total
            // For SimpleLogs: We treat each entry as a TAKEN event. 
            // Since SimpleLogs don't have a "missed" concept, they reinforce adherence if present.
            
            long totalScheduled = dailyDoseLogs.size();
            long takenDoses = dailyDoseLogs.stream()
                    .filter(log -> DoseLog.DoseStatus.TAKEN.equals(log.getStatus()))
                    .count();

            // If we have simple logs but no scheduled logs, we treat it as 100% adherence for that specific log entry
            // If we have both, we sum them.
            double percentage;
            if (totalScheduled > 0) {
                percentage = Math.round(((double) takenDoses / totalScheduled) * 1000.0) / 10.0;
            } else if (!dailySimpleLogs.isEmpty()) {
                // Only simple logs exist — assume 100% for that day because they represent "taking medicine"
                percentage = 100.0;
            } else {
                percentage = 0.0; // fallback handles missed
            }

            trend.add(new AdherenceDataPoint(dateStr, percentage));
        }

        return trend;
    }
    public double getOverallAdherence(Long patientId) {
        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        List<DoseLog> doseLogs = doseLogRepository.findByPatientOrderByScheduledTimeDesc(patient);
        if (doseLogs.isEmpty()) {
            return 100.0; // Assume perfect if no active rx/schedule
        }

        long total = doseLogs.size();
        long taken = doseLogs.stream()
                .filter(log -> DoseLog.DoseStatus.TAKEN.equals(log.getStatus()))
                .count();

        return Math.round(((double) taken / total) * 1000.0) / 10.0;
    }
}
