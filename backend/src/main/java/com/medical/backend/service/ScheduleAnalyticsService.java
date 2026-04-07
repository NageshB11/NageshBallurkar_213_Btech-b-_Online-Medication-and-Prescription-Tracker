package com.medical.backend.service;

import com.medical.backend.dto.ScheduleAnalyticsDTO;
import com.medical.backend.entity.DoseLog;
import com.medical.backend.entity.MedicationSchedule;
import com.medical.backend.entity.User;
import com.medical.backend.repository.DoseLogRepository;
import com.medical.backend.repository.MedicationScheduleRepository;
import com.medical.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ScheduleAnalyticsService {

    @Autowired
    private DoseLogRepository doseLogRepo;
    @Autowired
    private MedicationScheduleRepository scheduleRepo;
    @Autowired
    private com.medical.backend.repository.AdherenceLogRepository adherenceLogRepository;
    @Autowired
    private UserRepository userRepository;

    public List<ScheduleAnalyticsDTO> getAdherenceRates() {
        LocalDateTime start = LocalDate.now().minusDays(30).atStartOfDay();
        LocalDateTime end = LocalDateTime.now();

        List<MedicationSchedule> allSchedules = scheduleRepo.findAll();
        Map<Long, User> patientMap = allSchedules.stream()
                .map(MedicationSchedule::getPatient)
                .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> a));

        List<ScheduleAnalyticsDTO> result = new ArrayList<>();
        for (User patient : patientMap.values()) {
            List<DoseLog> logs = doseLogRepo.findByPatientAndDateRange(patient, start, end);
            if (logs.isEmpty())
                continue;

            long total = logs.size();
            long taken = logs.stream().filter(l -> l.getStatus() == DoseLog.DoseStatus.TAKEN).count();
            long missed = logs.stream().filter(l -> l.getStatus() == DoseLog.DoseStatus.MISSED).count();
            long skipped = logs.stream().filter(l -> l.getStatus() == DoseLog.DoseStatus.SKIPPED).count();
            double adherence = total > 0 ? (taken * 100.0 / total) : 0.0;

            ScheduleAnalyticsDTO dto = new ScheduleAnalyticsDTO();
            dto.setPatientId(patient.getId());
            dto.setPatientName(patient.getFullName() != null ? patient.getFullName() : patient.getEmail());
            dto.setTotalDoses(total);
            dto.setTakenCount(taken);
            dto.setMissedCount(missed);
            dto.setSkippedCount(skipped);
            dto.setAdherencePercent(Math.round(adherence * 10.0) / 10.0);
            dto.setHighMissRate(total > 0 && (missed * 100.0 / total) > 30.0);
            result.add(dto);
        }

        result.sort(Comparator.comparingDouble(ScheduleAnalyticsDTO::getAdherencePercent));
        return result;
    }

    public List<Map<String, Object>> getTopScheduledMedicines() {
        return doseLogRepo.findAll().stream()
                .collect(Collectors.groupingBy(
                        l -> l.getScheduleItem().getMedicineName(),
                        Collectors.counting()))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(10)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("medicineName", e.getKey());
                    m.put("count", e.getValue());
                    return m;
                })
                .collect(Collectors.toList());
    }

    public List<ScheduleAnalyticsDTO> getHighMissRatePatients() {
        return getAdherenceRates().stream()
                .filter(ScheduleAnalyticsDTO::isHighMissRate)
                .collect(Collectors.toList());
    }

    /**
     * Returns the 30-day adherence percentage for a specific patient identified
     * by email. Used by the patient-facing /my-adherence API.
     */
    public double getPatientAdherence(String email) {
        com.medical.backend.entity.User patient = userRepository.findByEmail(email).orElse(null);
        if (patient == null)
            return 0.0;

        LocalDateTime start = LocalDate.now().minusDays(30).atStartOfDay();
        LocalDateTime end = LocalDateTime.now();

        // 1. Scheduled Doses (New System)
        List<com.medical.backend.entity.DoseLog> logs = doseLogRepo.findByPatientAndDateRange(patient, start, end);
        
        // 2. Simple Logs (Legacy System)
        List<com.medical.backend.entity.AdherenceLog> simpleLogs = adherenceLogRepository.findByPatientId(patient.getId());
        List<com.medical.backend.entity.AdherenceLog> simpleLogs30Days = simpleLogs.stream()
                .filter(l -> !l.getLogDate().isBefore(start) && !l.getLogDate().isAfter(end))
                .collect(Collectors.toList());

        if (logs.isEmpty() && simpleLogs30Days.isEmpty())
            return 0.0;

        long scheduledDoseTotal = logs.stream()
                .filter(l -> l.getScheduledTime().isBefore(LocalDateTime.now().plusMinutes(1)))
                .count();
        long takenDoseCount = logs.stream()
                .filter(l -> l.getScheduledTime().isBefore(LocalDateTime.now().plusMinutes(1)))
                .filter(l -> l.getStatus() == com.medical.backend.entity.DoseLog.DoseStatus.TAKEN)
                .count();

        // For Overall Score: Merge Simple Logs
        // Logic: Count Simple Logs as BOTH a scheduled dose and a taken dose (100% adherence per entry)
        long totalMerged = scheduledDoseTotal + simpleLogs30Days.size();
        long takenMerged = takenDoseCount + simpleLogs30Days.size();

        if (totalMerged == 0)
            return 0.0;

        double pct = Math.round((takenMerged * 100.0 / totalMerged) * 10.0) / 10.0;
        return pct;
    }

    /**
     * Returns a list of daily adherence points for a specific patient.
     * Used for rendering the Adherence Trend Line Chart.
     * Returns Map of "date" (String YYYY-MM-DD) -> "percent" (Double)
     */
    public List<Map<String, Object>> getAdherenceTrend(Long patientId, int days) {
        User patient = userRepository.findById(patientId).orElse(null);

        if (patient == null) {
            return new ArrayList<>();
        }

        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start = end.minusDays(days).withHour(0).withMinute(0).withSecond(0).withNano(0);

        List<DoseLog> allLogs = doseLogRepo.findByPatientAndDateRange(patient, start, end);

        // Group logs by Date string (YYYY-MM-DD)
        Map<String, List<DoseLog>> groupedLogs = allLogs.stream()
                .collect(Collectors.groupingBy(log -> log.getScheduledTime().toLocalDate().toString()));

        // 2. Fetch ALL historical simple logs (AdherenceLog)
        List<com.medical.backend.entity.AdherenceLog> simpleLogs = adherenceLogRepository.findByPatientId(patientId);

        // If no data exists at all for this patient in this range, return empty to avoid dummy data
        if (allLogs.isEmpty() && simpleLogs.isEmpty()) {
            return new java.util.ArrayList<>();
        }

        List<Map<String, Object>> trend = new ArrayList<>();
        Map<String, List<com.medical.backend.entity.AdherenceLog>> simpleLogsByDate = simpleLogs.stream()
                .filter(l -> !l.getLogDate().isBefore(start) && !l.getLogDate().isAfter(end))
                .collect(Collectors.groupingBy(log -> log.getLogDate().toLocalDate().toString()));

        // Loop through each day from start to end (to include days with 0 scheduled
        // doses)
        for (int i = days; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            String dateString = date.toString();
            List<DoseLog> dailyLogs = groupedLogs.getOrDefault(dateString, new ArrayList<>());
            List<com.medical.backend.entity.AdherenceLog> dailySimpleLogs = simpleLogsByDate.getOrDefault(dateString, new ArrayList<>());

            long totalScheduledForDay = dailyLogs.stream()
                    .filter(l -> l.getScheduledTime().isBefore(LocalDateTime.now()))
                    .count();
            long takenForDay = dailyLogs.stream()
                    .filter(l -> l.getScheduledTime().isBefore(LocalDateTime.now()))
                    .filter(l -> l.getStatus() == com.medical.backend.entity.DoseLog.DoseStatus.TAKEN)
                    .count();

            double adherence = 0.0;
            if (totalScheduledForDay > 0) {
                // Merge simple logs if scheduled doses exist? 
                // Or just use scheduled doses as the primary source of truth for the DAY.
                // Let's summing them up for consistency with the overall gauge above.
                long dayTotal = totalScheduledForDay + dailySimpleLogs.size();
                long dayTaken = takenForDay + dailySimpleLogs.size();
                adherence = Math.round((dayTaken * 100.0 / dayTotal) * 10.0) / 10.0;
            } else if (!dailySimpleLogs.isEmpty()) {
                // If only simple logs exist
                adherence = 100.0;
            } else {
                // No scheduled doses and no simple logs for this day = no data.
                // Default to 0% to avoid misleading "flat 100%" lines.
                adherence = 0.0;
            }

            trend.add(Map.of(
                    "date", dateString,
                    "percent", adherence));
        }

        return trend;
    }
}
