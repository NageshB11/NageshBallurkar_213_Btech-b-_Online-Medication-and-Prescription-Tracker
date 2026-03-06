package com.medical.backend.service;

import com.medical.backend.dto.DoseLogDTO;
import com.medical.backend.entity.DoseLog;
import com.medical.backend.entity.User;
import com.medical.backend.repository.DoseLogRepository;
import com.medical.backend.repository.UserRepository;
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
    private UserRepository userRepo;

    public List<DoseLogDTO> getTodaysDoses(String email) {
        User patient = getUser(email);
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = start.plusDays(1);
        List<DoseLog> logs = doseLogRepo.findByPatientAndDateRange(patient, start, end);
        return logs.stream().map(this::toDTO).collect(Collectors.toList());
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
            log.setActualTime(LocalDateTime.now());
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

    private User getUser(String email) {
        return userRepo.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }
}
