package com.medical.backend.service;

import com.medical.backend.entity.*;
import com.medical.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class ScheduleReminderJob {

    @Autowired
    private MedicationScheduleRepository scheduleRepo;
    @Autowired
    private ScheduleItemRepository itemRepo;
    @Autowired
    private DoseLogRepository doseLogRepo;
    @Autowired
    private PatientMealPrefsRepository mealPrefsRepo;
    @Autowired
    private NotificationService notificationService;
    @Autowired
    private MedScheduleService medScheduleService;

    /**
     * Runs every 15 minutes.
     * Checks upcoming meal-based doses and fires Notification Bell reminders.
     * Skips doses that are currently snoozed (snoozedUntil > now).
     * Re-fires reminders when snoozedUntil falls within the current window.
     */
    @Scheduled(cron = "0 */15 * * * *")
    @Transactional
    public void fireUpcomingDoseReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime windowEnd = now.plusMinutes(16);

        List<MedicationSchedule> activeSchedules = scheduleRepo
                .findAll()
                .stream()
                .filter(s -> s.getStatus() == MedicationSchedule.ScheduleStatus.ACTIVE)
                .toList();

        for (MedicationSchedule schedule : activeSchedules) {
            PatientMealPrefs prefs = mealPrefsRepo.findByPatient(schedule.getPatient())
                    .orElse(null);

            List<ScheduleItem> items = itemRepo.findBySchedule(schedule);
            for (ScheduleItem item : items) {
                if (item.getMealSlots() == null || item.getMealSlots().isEmpty())
                    continue;

                boolean isBefore = "BEFORE_FOOD".equalsIgnoreCase(item.getFoodInstruction());
                int offset = (prefs != null && isBefore) ? prefs.getPreMealOffsetMinutes() : 0;

                for (String rawSlot : item.getMealSlots().split(",")) {
                    String slot = rawSlot.trim();
                    LocalTime mealTime = resolveMealTime(slot, prefs);
                    if (mealTime == null)
                        continue;

                    LocalDateTime scheduledTime = LocalDateTime.of(LocalDate.now(),
                            isBefore ? mealTime.minusMinutes(offset) : mealTime);

                    // Determine effective reminder time (use snoozedUntil if snoozed)
                    List<DoseLog> existingLogs = doseLogRepo.findByScheduleItemAndDateRange(
                            item.getId(), scheduledTime.minusMinutes(10), scheduledTime.plusMinutes(10));

                    LocalDateTime effectiveTime = scheduledTime;
                    if (!existingLogs.isEmpty()) {
                        DoseLog log = existingLogs.get(0);
                        // Skip if currently snoozed and snoozedUntil hasn't lapsed
                        if (log.getStatus() == DoseLog.DoseStatus.SNOOZED
                                && log.getSnoozedUntil() != null
                                && log.getSnoozedUntil().isAfter(now)) {
                            effectiveTime = log.getSnoozedUntil();
                        }
                        // Skip already-actioned doses
                        if (log.getStatus() == DoseLog.DoseStatus.TAKEN
                                || log.getStatus() == DoseLog.DoseStatus.MISSED
                                || log.getStatus() == DoseLog.DoseStatus.SKIPPED) {
                            continue;
                        }
                    }

                    if (effectiveTime.isAfter(now) && effectiveTime.isBefore(windowEnd)) {
                        ensureDoseLog(item, slot, item.getFoodInstruction(), scheduledTime);

                        String foodLabel = isBefore
                                ? "before your " + displayMeal(slot) + " in " + offset + " min"
                                : "after " + displayMeal(slot);
                        String msg = "💊 Time to take " + item.getMedicineName()
                                + " " + item.getDosage() + " — " + foodLabel;
                        notificationService.createNotification(schedule.getPatient(), msg, "REMINDER");
                    }
                }
            }
        }
    }

    /**
     * Runs every 5 minutes.
     * Auto-marks PENDING or SNOOZED doses as MISSED if 60+ minutes have passed
     * since scheduledTime (or since snoozedUntil for snoozed doses).
     */
    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void markAutoMissed() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime missedCutoff = now.minusMinutes(60);

        List<DoseLog> candidates = doseLogRepo.findPendingBefore(missedCutoff);
        for (DoseLog log : candidates) {
            // For snoozed doses: check snoozedUntil + 60 min window
            if (log.getStatus() == DoseLog.DoseStatus.SNOOZED
                    || log.getStatus() == DoseLog.DoseStatus.PENDING) {
                LocalDateTime deadline = log.getSnoozedUntil() != null
                        ? log.getSnoozedUntil().plusMinutes(60)
                        : log.getScheduledTime().plusMinutes(60);
                if (now.isAfter(deadline)) {
                    log.setStatus(DoseLog.DoseStatus.MISSED);
                    doseLogRepo.save(log);
                    String label = buildDisplayLabel(log.getMealSlot(), log.getFoodInstruction());
                    notificationService.createNotification(log.getPatient(),
                            "⚠️ Missed dose: " + log.getScheduleItem().getMedicineName()
                                    + " (" + label + ") — taken no action within 60 minutes.",
                            "WARNING");
                }
            }
        }
    }

    /**
     * Runs daily at midnight (00:01) as a safety sweep for any remaining PENDING
     * doses.
     */
    @Scheduled(cron = "0 1 0 * * *")
    @Transactional
    public void markMissedDoses() {
        LocalDateTime cutoff = LocalDate.now().atStartOfDay();
        List<DoseLog> stale = doseLogRepo.findPendingBefore(cutoff);
        for (DoseLog log : stale) {
            log.setStatus(DoseLog.DoseStatus.MISSED);
            doseLogRepo.save(log);
            String label = buildDisplayLabel(log.getMealSlot(), log.getFoodInstruction());
            notificationService.createNotification(log.getPatient(),
                    "You missed your " + label + " dose of " + log.getScheduleItem().getMedicineName(),
                    "WARNING");
        }
    }

    /**
     * Runs daily at midnight (00:00).
     * Pre-generates PENDING DoseLog rows for all active schedules for today.
     */
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void generateDailyDoseLogs() {
        List<MedicationSchedule> activeSchedules = scheduleRepo.findAll()
                .stream()
                .filter(s -> s.getStatus() == MedicationSchedule.ScheduleStatus.ACTIVE)
                .toList();

        for (MedicationSchedule schedule : activeSchedules) {
            PatientMealPrefs prefs = mealPrefsRepo.findByPatient(schedule.getPatient()).orElse(null);
            List<ScheduleItem> items = itemRepo.findBySchedule(schedule);
            medScheduleService.generateDoseLogsForDate(items, prefs, LocalDate.now());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────

    private void ensureDoseLog(ScheduleItem item, String slot, String foodInstruction,
            LocalDateTime scheduledTime) {
        List<DoseLog> existing = doseLogRepo.findByScheduleItemAndDateRange(
                item.getId(),
                scheduledTime.minusMinutes(10),
                scheduledTime.plusMinutes(10));
        if (existing.isEmpty()) {
            DoseLog log = new DoseLog();
            log.setScheduleItem(item);
            log.setPatient(item.getSchedule().getPatient());
            log.setMealSlot(slot);
            log.setFoodInstruction(foodInstruction);
            log.setScheduledTime(scheduledTime);
            log.setStatus(DoseLog.DoseStatus.PENDING);
            doseLogRepo.save(log);
        }
    }

    private LocalTime resolveMealTime(String slot, PatientMealPrefs prefs) {
        if (prefs == null) {
            return switch (slot.toUpperCase()) {
                case "BREAKFAST" -> LocalTime.of(8, 0);
                case "LUNCH" -> LocalTime.of(13, 0);
                case "DINNER" -> LocalTime.of(20, 0);
                default -> null;
            };
        }
        return switch (slot.toUpperCase()) {
            case "BREAKFAST" -> prefs.getBreakfastTime();
            case "LUNCH" -> prefs.getLunchTime();
            case "DINNER" -> prefs.getDinnerTime();
            default -> null;
        };
    }

    private String displayMeal(String slot) {
        return switch (slot.toUpperCase()) {
            case "BREAKFAST" -> "Breakfast";
            case "LUNCH" -> "Lunch";
            case "DINNER" -> "Dinner";
            default -> slot;
        };
    }

    private String buildDisplayLabel(String slot, String foodInstruction) {
        String prep = "BEFORE_FOOD".equalsIgnoreCase(foodInstruction) ? "Before " : "After ";
        return prep + displayMeal(slot != null ? slot : "");
    }
}
