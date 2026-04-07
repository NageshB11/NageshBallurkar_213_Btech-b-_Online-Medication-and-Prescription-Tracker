package com.medical.backend.service;

import com.medical.backend.dto.DoseLogDTO;
import com.medical.backend.entity.DoseLog;
import com.medical.backend.entity.User;
import com.medical.backend.repository.DoseLogRepository;
import com.medical.backend.repository.UserRepository;
import com.medical.backend.repository.AdherenceLogRepository; // Added import
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class DoseTrackingService {

    @Autowired
    private DoseLogRepository doseLogRepo;
    @Autowired
    private DoseReminderService doseReminderService;
    @Autowired
    private UserRepository userRepo;
    @Autowired
    private SystemAuditRepository auditRepo;
    @Autowired
    private AdherenceLogRepository adherenceLogRepo;

    public List<DoseLogDTO> getTodaysDoses(String email) {
        User patient = getUser(email);
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = start.plusDays(1);
        List<DoseLog> logs = doseLogRepo.findByPatientAndDateRange(patient, start, end);
        List<DoseLogDTO> dtos = logs.stream().map(this::toDTO).collect(Collectors.toList());
        
        // Trigger background reminder if pending doses exist
        doseReminderService.checkAndNotifyPatient(patient, dtos);
        
        return dtos;
    }

    @Transactional
    public DoseLogDTO markDose(Long doseId, String status, String notes, String email) {
        DoseLog log = doseLogRepo.findById(doseId)
                .orElseThrow(() -> new RuntimeException("Dose log not found"));
        User patient = getUser(email);
        if (!log.getPatient().getId().equals(patient.getId())) {
            throw new RuntimeException("Access denied");
        }
        log.setStatus(DoseLog.DoseStatus.valueOf(status.toUpperCase()));
        if (status.equalsIgnoreCase("TAKEN")) {
            if (log.getScheduledTime().isAfter(LocalDateTime.now())) {
                throw new RuntimeException("Cannot log a future dose as TAKEN.");
            }
            log.setActualTime(LocalDateTime.now());
            
            // Sync with AdherenceLog (Legacy system for overall adherence gauge)
            if (log.getScheduleItem() != null && log.getScheduleItem().getSchedule() != null && 
                log.getScheduleItem().getSchedule().getPrescription() != null) {
                
                com.medical.backend.entity.Prescription prescription = log.getScheduleItem().getSchedule().getPrescription();
                
                // Create life-cycle log
                com.medical.backend.entity.AdherenceLog legacyLog = new com.medical.backend.entity.AdherenceLog();
                legacyLog.setPatient(patient);
                legacyLog.setPrescription(prescription);
                legacyLog.setLogDate(LocalDateTime.now());
                adherenceLogRepo.save(legacyLog);
            }
        }
        if (notes != null)
            log.setNotes(notes);
        return toDTO(doseLogRepo.save(log));
    }

    @Transactional
    public DoseLogDTO snoozeDose(Long doseId, String email) {
        DoseLog log = doseLogRepo.findById(doseId)
                .orElseThrow(() -> new RuntimeException("Dose log not found"));
        User patient = getUser(email);
        if (!log.getPatient().getId().equals(patient.getId())) {
            throw new RuntimeException("Access denied");
        }
        if (log.getStatus() != DoseLog.DoseStatus.PENDING
                && log.getStatus() != DoseLog.DoseStatus.SNOOZED) {
            throw new RuntimeException("Cannot snooze a dose that is " + log.getStatus());
        }
        log.setSnoozedUntil(LocalDateTime.now().plusMinutes(15));
        log.setSnoozeCount(log.getSnoozeCount() + 1);
        log.setStatus(DoseLog.DoseStatus.SNOOZED);
        return toDTO(doseLogRepo.save(log));
    }

    public List<DoseLogDTO> getDoseHistory(String email) {
        User patient = getUser(email);
        return doseLogRepo.findByPatientOrderByScheduledTimeDesc(patient)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public DoseLogDTO toDTO(DoseLog log) {
        DoseLogDTO dto = new DoseLogDTO();
        dto.setDoseId(log.getId());
        dto.setMedicineName(log.getScheduleItem().getMedicineName());
        dto.setDosage(log.getScheduleItem().getDosage());
        dto.setMealSlot(log.getMealSlot());
        dto.setFoodInstruction(log.getFoodInstruction());
        dto.setDisplayLabel(buildDisplayLabel(log.getMealSlot(), log.getFoodInstruction()));
        dto.setMealSlotIcon(mealIcon(log.getMealSlot()));
        dto.setScheduledTime(log.getScheduledTime());
        dto.setActualTime(log.getActualTime());
        dto.setSnoozedUntil(log.getSnoozedUntil());
        dto.setSnoozeCount(log.getSnoozeCount());
        dto.setStatus(log.getStatus() != null ? log.getStatus().name() : "PENDING");
        dto.setNotes(log.getNotes());
        dto.setScheduleItemId(log.getScheduleItem().getId());
        return dto;
    }

    private String buildDisplayLabel(String mealSlot, String foodInstruction) {
        if (mealSlot == null)
            return "Dose";
        String prep = "BEFORE_FOOD".equalsIgnoreCase(foodInstruction) ? "Before " : "After ";
        String meal = switch (mealSlot.toUpperCase()) {
            case "BREAKFAST" -> "Breakfast";
            case "LUNCH" -> "Lunch";
            case "DINNER" -> "Dinner";
            default -> mealSlot;
        };
        return prep + meal;
    }

    private String mealIcon(String slot) {
        if (slot == null)
            return "💊";
        return switch (slot.toUpperCase()) {
            case "BREAKFAST" -> "🌅";
            case "LUNCH" -> "☀️";
            case "DINNER" -> "🌙";
            default -> "💊";
        };
    }

    /**
     * Returns dose logs grouped by date with daily adherence %.
     * Each "block" represents one dose slot on a specific date.
     * Weight per dose = 1/N where N = total doses for that day.
     */
    public List<java.util.Map<String, Object>> getAdherenceBlocks(String email) {
        User patient = getUser(email);
        List<DoseLog> allLogs = doseLogRepo.findByPatientOrderByScheduledTimeDesc(patient);

        // Group by date (TreeMap keeps dates in ascending order)
        java.util.Map<LocalDate, List<DoseLog>> byDate = allLogs.stream()
                .collect(Collectors.groupingBy(
                        log -> log.getScheduledTime().toLocalDate(),
                        java.util.TreeMap::new,
                        Collectors.toList()));

        // Within each day, sort by scheduled time ASC
        byDate.forEach((date, dayLogs) -> {
            dayLogs.sort(java.util.Comparator.comparing(DoseLog::getScheduledTime));
        });

        List<java.util.Map<String, Object>> result = new java.util.ArrayList<>();
        for (var entry : byDate.entrySet()) {
            LocalDate date = entry.getKey();
            List<DoseLog> dayLogs = entry.getValue();

            int totalDoses = dayLogs.size();
            long takenCount = dayLogs.stream()
                    .filter(l -> l.getStatus() == DoseLog.DoseStatus.TAKEN).count();
            long missedCount = dayLogs.stream()
                    .filter(l -> l.getStatus() == DoseLog.DoseStatus.MISSED).count();
            double weight = totalDoses > 0 ? Math.round((100.0 / totalDoses) * 100.0) / 100.0 : 0;
            double dailyAdherence = totalDoses > 0
                    ? Math.round((takenCount * 100.0 / totalDoses) * 10.0) / 10.0
                    : 0;

            java.util.Map<String, Object> dayBlock = new java.util.LinkedHashMap<>();
            dayBlock.put("date", date.toString());
            dayBlock.put("dayLabel", date.getDayOfWeek().name().substring(0, 3));
            dayBlock.put("totalDoses", totalDoses);
            dayBlock.put("takenCount", takenCount);
            dayBlock.put("missedCount", missedCount);
            dayBlock.put("pendingCount", totalDoses - takenCount - missedCount);
            dayBlock.put("weightPerDose", weight);
            dayBlock.put("dailyAdherence", dailyAdherence);

            // Individual doses within this day
            List<java.util.Map<String, Object>> doses = dayLogs.stream().map(log -> {
                java.util.Map<String, Object> d = new java.util.LinkedHashMap<>();
                d.put("doseId", log.getId());
                d.put("medicineName", log.getScheduleItem().getMedicineName());
                d.put("dosage", log.getScheduleItem().getDosage());
                d.put("mealSlot", log.getMealSlot());
                d.put("scheduledTime", log.getScheduledTime().toString());
                d.put("status", log.getStatus().name());
                d.put("weight", weight);
                return d;
            }).collect(Collectors.toList());
            dayBlock.put("doses", doses);

            result.add(dayBlock);
        }
        return result;
    }

    private User getUser(String email) {
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }
}
