package com.medical.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medical.backend.dto.MedScheduleDTO;
import com.medical.backend.entity.*;
import com.medical.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class MedScheduleService {

    @Autowired
    private MedicationScheduleRepository scheduleRepo;
    @Autowired
    private ScheduleItemRepository itemRepo;
    @Autowired
    private ScheduleAuditRepository auditRepo;
    @Autowired
    private PatientMealPrefsRepository mealPrefsRepo;
    @Autowired
    private DoseLogRepository doseLogRepo;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PrescriptionRepository prescriptionRepo;
    @Autowired
    private PrescriptionItemRepository prescriptionItemRepo;
    @Autowired
    private MedicineRepository medicineRepo;
    @Autowired
    private NotificationService notificationService;
    @Autowired
    private ObjectMapper objectMapper;

    // ── Meal Prefs ────────────────────────────────────────────────────

    public PatientMealPrefs getMealPrefs(String email) {
        User patient = getUser(email);
        return mealPrefsRepo.findByPatient(patient).orElseGet(() -> {
            PatientMealPrefs defaults = new PatientMealPrefs();
            defaults.setPatient(patient);
            return defaults; // not persisted yet — patient fills them in
        });
    }

    @Transactional
    public PatientMealPrefs saveMealPrefs(String email, PatientMealPrefs prefs) {
        User patient = getUser(email);
        PatientMealPrefs existing = mealPrefsRepo.findByPatient(patient)
                .orElse(new PatientMealPrefs());
        existing.setPatient(patient);
        existing.setBreakfastTime(prefs.getBreakfastTime());
        existing.setLunchTime(prefs.getLunchTime());
        existing.setDinnerTime(prefs.getDinnerTime());
        if (prefs.getPreMealOffsetMinutes() > 0)
            existing.setPreMealOffsetMinutes(prefs.getPreMealOffsetMinutes());
        existing.setUpdatedAt(LocalDateTime.now());
        return mealPrefsRepo.save(existing);
    }

    // ── Schedule CRUD ─────────────────────────────────────────────────

    @Transactional
    public MedicationSchedule createSchedule(String patientEmail, MedScheduleDTO req) {
        User patient = getUser(patientEmail);
        Prescription prescription = prescriptionRepo.findById(req.getPrescriptionId())
                .orElseThrow(() -> new RuntimeException("Prescription not found"));

        // 1. Persist or update meal prefs from step-1 of wizard
        PatientMealPrefs mealPrefs = saveMealPrefsFromDTO(patient, req);

        // 2. Build schedule
        MedicationSchedule schedule = new MedicationSchedule();
        schedule.setPatient(patient);
        schedule.setPrescription(prescription);
        schedule.setScheduleName(req.getScheduleName() != null
                ? req.getScheduleName()
                : "Schedule for Rx #" + prescription.getId());
        schedule.setStartDate(req.getStartDate() != null ? req.getStartDate() : LocalDate.now());
        schedule.setStatus(MedicationSchedule.ScheduleStatus.ACTIVE);
        schedule = scheduleRepo.save(schedule);

        // 3. Build schedule items from prescription items
        List<ScheduleItem> items = buildItems(schedule, req, prescription);
        itemRepo.saveAll(items);

        // 4. Pre-generate Day 1 dose logs
        generateDoseLogsForDate(items, mealPrefs, LocalDate.now());

        // 5. Audit v1.0 CREATED
        recordAudit(schedule, patient, ScheduleAudit.ChangeType.CREATED,
                "Created from Prescription #" + prescription.getId(), "1.0", schedule);

        return schedule;
    }

    public List<MedicationSchedule> getMySchedules(String email) {
        User patient = getUser(email);
        return scheduleRepo.findByPatient(patient);
    }

    public MedicationSchedule getScheduleById(Long id, String email) {
        MedicationSchedule schedule = scheduleRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));
        User requester = getUser(email);
        // Allow patient (own) or doctor/admin
        if (!schedule.getPatient().getId().equals(requester.getId())
                && !requester.getRole().name().matches("DOCTOR|ADMIN")) {
            throw new RuntimeException("Access denied");
        }
        return schedule;
    }

    public List<MedicationSchedule> getSchedulesByPatientId(Long patientId) {
        return scheduleRepo.findByPatient_Id(patientId);
    }

    @Transactional
    public MedicationSchedule updateStatus(Long id, String status, String email) {
        MedicationSchedule schedule = scheduleRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));
        User modifier = getUser(email);
        MedicationSchedule.ScheduleStatus newStatus = MedicationSchedule.ScheduleStatus.valueOf(status.toUpperCase());

        ScheduleAudit.ChangeType changeType = switch (newStatus) {
            case PAUSED -> ScheduleAudit.ChangeType.PAUSED;
            case ACTIVE -> ScheduleAudit.ChangeType.RESUMED;
            case CANCELLED -> ScheduleAudit.ChangeType.CANCELLED;
            default -> ScheduleAudit.ChangeType.MODIFIED;
        };

        String oldVersion = latestVersion(schedule);
        schedule.setStatus(newStatus);
        schedule.setModifiedBy(modifier);
        schedule.setUpdatedAt(LocalDateTime.now());
        schedule = scheduleRepo.save(schedule);

        String newVersion = bumpVersion(oldVersion);
        recordAudit(schedule, modifier, changeType,
                "Status changed to " + newStatus.name() + " by " + modifier.getName(), newVersion, schedule);

        // Notify patient if doctor changed it
        if (!modifier.getId().equals(schedule.getPatient().getId())) {
            notificationService.createNotification(schedule.getPatient(),
                    "Dr. " + modifier.getName() + " changed your schedule status to " + newStatus.name(),
                    "INFO");
        }
        return schedule;
    }

    // ── Internal helpers ──────────────────────────────────────────────

    private List<ScheduleItem> buildItems(MedicationSchedule schedule, MedScheduleDTO req,
            Prescription prescription) {
        List<ScheduleItem> items = new ArrayList<>();
        if (req.getItems() == null || req.getItems().isEmpty()) {
            // Auto-build from all prescription items
            for (PrescriptionItem pi : prescription.getItems()) {
                items.add(buildItemFromPrescriptionItem(schedule, pi, null));
            }
        } else {
            for (MedScheduleDTO.ScheduleItemRequest ir : req.getItems()) {
                PrescriptionItem pi = ir.getPrescriptionItemId() != null
                        ? prescriptionItemRepo.findById(ir.getPrescriptionItemId()).orElse(null)
                        : null;
                ScheduleItem item = pi != null
                        ? buildItemFromPrescriptionItem(schedule, pi, ir)
                        : buildItemFromRequest(schedule, ir);
                items.add(item);
            }
        }
        return items;
    }

    private ScheduleItem buildItemFromPrescriptionItem(MedicationSchedule schedule,
            PrescriptionItem pi,
            MedScheduleDTO.ScheduleItemRequest override) {
        ScheduleItem item = new ScheduleItem();
        item.setSchedule(schedule);
        item.setPrescriptionItem(pi);
        item.setMedicineName(pi.getMedicineName());
        item.setDosage(pi.getDosage());
        item.setMealSlots(pi.getMealSlots());
        item.setFoodInstruction(pi.getFoodInstruction());
        item.setFrequency(ScheduleItem.Frequency.DAILY);
        if (pi.getEndDate() != null && pi.getStartDate() != null) {
            long days = java.time.temporal.ChronoUnit.DAYS.between(pi.getStartDate(), pi.getEndDate());
            item.setDurationDays((int) days);
        }
        if (override != null) {
            if (override.getFrequency() != null)
                item.setFrequency(ScheduleItem.Frequency.valueOf(override.getFrequency()));
            if (override.getDaysOfWeek() != null)
                item.setDaysOfWeek(override.getDaysOfWeek());
            if (override.getDurationDays() != null)
                item.setDurationDays(override.getDurationDays());
            if (override.getInstructions() != null)
                item.setInstructions(override.getInstructions());
        }
        return item;
    }

    private ScheduleItem buildItemFromRequest(MedicationSchedule schedule,
            MedScheduleDTO.ScheduleItemRequest ir) {
        ScheduleItem item = new ScheduleItem();
        item.setSchedule(schedule);
        item.setMedicineName(ir.getMedicineName());
        item.setDosage(ir.getDosage());
        item.setFrequency(ir.getFrequency() != null
                ? ScheduleItem.Frequency.valueOf(ir.getFrequency())
                : ScheduleItem.Frequency.DAILY);
        item.setDaysOfWeek(ir.getDaysOfWeek());
        item.setDurationDays(ir.getDurationDays());
        item.setInstructions(ir.getInstructions());
        if (ir.getMedicineId() != null) {
            medicineRepo.findById(ir.getMedicineId()).ifPresent(item::setMedicine);
        }
        return item;
    }

    public void generateDoseLogsForDate(List<ScheduleItem> items, PatientMealPrefs prefs, LocalDate date) {
        for (ScheduleItem item : items) {
            String slots = item.getMealSlots();
            if (slots == null || slots.isEmpty()) {
                // Non-meal-based: use reminderTimes if present, or skip
                continue;
            }
            boolean isBefore = "BEFORE_FOOD".equalsIgnoreCase(item.getFoodInstruction());
            int offset = (prefs != null && isBefore) ? prefs.getPreMealOffsetMinutes() : 0;

            for (String slot : slots.split(",")) {
                slot = slot.trim();
                LocalTime mealTime = resolveMealTime(slot, prefs);
                if (mealTime == null)
                    continue;

                LocalDateTime scheduledTime = LocalDateTime.of(date,
                        isBefore ? mealTime.minusMinutes(offset) : mealTime);

                // Avoid duplicates
                List<DoseLog> existing = doseLogRepo.findByScheduleItemAndDateRange(
                        item.getId(),
                        scheduledTime.minusMinutes(5),
                        scheduledTime.plusMinutes(5));
                if (!existing.isEmpty())
                    continue;

                DoseLog log = new DoseLog();
                log.setScheduleItem(item);
                log.setPatient(item.getSchedule().getPatient());
                log.setMealSlot(slot);
                log.setFoodInstruction(item.getFoodInstruction());
                log.setScheduledTime(scheduledTime);
                log.setStatus(DoseLog.DoseStatus.PENDING);
                doseLogRepo.save(log);
            }
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

    private PatientMealPrefs saveMealPrefsFromDTO(User patient, MedScheduleDTO req) {
        PatientMealPrefs prefs = mealPrefsRepo.findByPatient(patient).orElse(new PatientMealPrefs());
        prefs.setPatient(patient);
        if (req.getBreakfastTime() != null)
            prefs.setBreakfastTime(req.getBreakfastTime());
        if (req.getLunchTime() != null)
            prefs.setLunchTime(req.getLunchTime());
        if (req.getDinnerTime() != null)
            prefs.setDinnerTime(req.getDinnerTime());
        if (req.getPreMealOffsetMinutes() != null)
            prefs.setPreMealOffsetMinutes(req.getPreMealOffsetMinutes());
        prefs.setUpdatedAt(LocalDateTime.now());
        return mealPrefsRepo.save(prefs);
    }

    private void recordAudit(MedicationSchedule schedule, User actor,
            ScheduleAudit.ChangeType type, String summary,
            String version, Object snapshot) {
        ScheduleAudit audit = new ScheduleAudit();
        audit.setSchedule(schedule);
        audit.setChangedBy(actor);
        audit.setChangeType(type);
        audit.setChangeSummary(summary);
        audit.setVersionLabel(version);
        try {
            audit.setSnapshotJson(objectMapper.writeValueAsString(snapshot));
        } catch (JsonProcessingException e) {
            audit.setSnapshotJson("{}");
        }
        auditRepo.save(audit);
    }

    private String latestVersion(MedicationSchedule schedule) {
        return auditRepo.findBySchedule_IdOrderByChangedAtDesc(schedule.getId())
                .stream().findFirst().map(ScheduleAudit::getVersionLabel).orElse("1.0");
    }

    private String bumpVersion(String version) {
        try {
            String[] parts = version.split("\\.");
            int minor = Integer.parseInt(parts[1]) + 1;
            return parts[0] + "." + minor;
        } catch (Exception e) {
            return "1.1";
        }
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));
    }

    public List<ScheduleAudit> getAuditTrail(Long scheduleId) {
        return auditRepo.findBySchedule_IdOrderByChangedAtDesc(scheduleId);
    }
}
