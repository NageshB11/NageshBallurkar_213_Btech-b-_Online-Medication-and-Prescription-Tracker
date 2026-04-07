package com.medical.backend.service;

import com.medical.backend.entity.Prescription;
import com.medical.backend.entity.PrescriptionAudit;
import com.medical.backend.entity.PrescriptionItem;
import com.medical.backend.repository.PrescriptionAuditRepository;
import com.medical.backend.entity.User;
import com.medical.backend.repository.PrescriptionRepository;
import com.medical.backend.repository.UserRepository;
import com.medical.backend.repository.SystemAlertRepository;
import com.medical.backend.dto.PatientAuditDTO;
import java.time.format.DateTimeFormatter;
import java.util.Objects;
import java.util.Collections;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class PrescriptionService {

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @Autowired
    private PrescriptionAuditRepository auditRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AnomalyDetectionService anomalyDetectionService;

    @Autowired
    private SystemAlertRepository systemAlertRepository;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private com.medical.backend.repository.DoseLogRepository doseLogRepository;



    @org.springframework.beans.factory.annotation.Value("${spring.servlet.multipart.location}")
    private String uploadDir;

    private Path fileStorageLocation;

    @jakarta.annotation.PostConstruct
    public void init() {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    public org.springframework.core.io.Resource getPrescriptionFile(Long prescriptionId, String userEmail) {
        Prescription prescription = getPrescription(prescriptionId);

        boolean isPatient = prescription.getPatient() != null && prescription.getPatient().getEmail().equals(userEmail);
        boolean isDoctor = prescription.getDoctor() != null && prescription.getDoctor().getEmail().equals(userEmail);

        User user = userRepository.findByEmail(userEmail).orElseThrow(() -> new RuntimeException("User not found"));
        boolean isPharmacist = user.getRole() == com.medical.backend.entity.Role.PHARMACIST;

        if (!isPatient && !isDoctor && !isPharmacist) {
            throw new RuntimeException("Unauthorized access to prescription file");
        }

        if (prescription.getFilePath() != null) {
            try {
                Path filePath = this.fileStorageLocation.resolve(prescription.getFilePath()).normalize();
                org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(
                        filePath.toUri());
                if (resource.exists()) {
                    return resource;
                } else {
                    throw new RuntimeException("File not found " + prescription.getFilePath());
                }
            } catch (Exception ex) {
                throw new RuntimeException("File not found " + prescription.getFilePath(), ex);
            }
        } else {
            throw new RuntimeException("No PDF file found for this prescription.");
        }
    }

    @Autowired
    private PdfService pdfService;

    @Autowired
    private SafetyGateValidator safetyGateValidator;

    @Transactional
    public Prescription createPrescription(Prescription prescription) throws IOException {
        System.out.println("[SERVICE] createPrescription started. Status: ISSUED");
        prescription.setStatus(Prescription.PrescriptionStatus.ISSUED);

        if (prescription.getPatientEmail() != null && !prescription.getPatientEmail().isEmpty()) {
            userRepository.findByEmail(prescription.getPatientEmail())
                    .ifPresent(prescription::setPatient);
        }

        // 1b. Resolve the pharmacist if pre-assigned
        if (prescription.getPharmacist() != null && prescription.getPharmacist().getId() != null) {
            userRepository.findById(prescription.getPharmacist().getId())
                    .ifPresent(ph -> {
                        if (ph.getRole() == com.medical.backend.entity.Role.PHARMACIST && ph.isVerified()) {
                            prescription.setPharmacist(ph);
                        } else {
                            System.out.println("[WARN] Pre-assigned pharmacist invalid or unverified: " + ph.getId());
                            prescription.setPharmacist(null);
                        }
                    });
        }

        // Clinical Intelligence Safety Gate (V4 - Master Validator)
        if (prescription.getPatient() != null && prescription.getItems() != null) {
            safetyGateValidator.validateSafety(prescription.getItems(), prescription.getPatient(), prescription.isOverrideInteraction());
        }

        // 2. Link items to this prescription
        if (prescription.getItems() != null) {
            for (PrescriptionItem item : prescription.getItems()) {
                item.setPrescription(prescription);
            }
        }

        // 3. Save first so the prescription gets an ID
        System.out.println("[SERVICE] Saving initial prescription...");
        Prescription saved = prescriptionRepository
                .save(prescription);
        System.out.println("[SERVICE] Initial save successful. ID: " + saved.getId());

        // 4. Generate PDF AFTER patient and ID are set
        if (!saved.isDraft()) {
            System.out.println("[SERVICE] Generating PDF...");
            String fileName = pdfService.generatePrescriptionPdf(saved);
            saved.setFilePath(fileName);
            System.out.println("[SERVICE] PDF generated: " + fileName);
            saved = prescriptionRepository.save(saved);
        }

        // 5. Anomaly Detection
        if (saved.getDoctor() != null) {
            System.out
                    .println("[SERVICE] Running anomaly detection for Doctor ID: " + saved.getDoctor().getId());
            if (anomalyDetectionService.checkAnomaly(saved.getDoctor().getId())) {
                System.out.println("[SERVICE] ANOMALY DETECTED!");
                com.medical.backend.entity.SystemAlert alert = new com.medical.backend.entity.SystemAlert();
                alert.setType("FRAUD_DETECTION");
                alert.setSeverity("CRITICAL");
                alert.setMessage("Doctor " + prescription.getDoctor().getFullName()
                        + " has exceeded the 24h prescription threshold.");
                systemAlertRepository.save(alert);
            }
        }

        return prescriptionRepository.save(prescription);
    }

    @Transactional
    public Prescription uploadPrescription(org.springframework.web.multipart.MultipartFile file, String patientEmail,
            String doctorEmail) throws IOException {
        String fileName = UUID.randomUUID().toString() + "_"
                + org.springframework.util.StringUtils.cleanPath(file.getOriginalFilename());
        if (fileName.contains("..")) {
            throw new RuntimeException("Filename contains invalid path sequence " + fileName);
        }

        Path targetLocation = this.fileStorageLocation.resolve(fileName);
        Files.copy(file.getInputStream(), targetLocation, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

        Prescription prescription = new Prescription();
        prescription.setFilePath(fileName);
        prescription.setStatus(Prescription.PrescriptionStatus.PENDING);
        prescription.setDraft(false);

        if (patientEmail != null && !patientEmail.isEmpty()) {
            prescription.setPatientEmail(patientEmail);
            userRepository.findByEmail(patientEmail).ifPresent(prescription::setPatient);
        }

        User doctor = userRepository.findByEmail(doctorEmail)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));
        prescription.setDoctor(doctor);

        // Anomaly Detection
        if (anomalyDetectionService.checkAnomaly(doctor.getId())) {
            com.medical.backend.entity.SystemAlert alert = new com.medical.backend.entity.SystemAlert();
            alert.setType("FRAUD_DETECTION");
            alert.setSeverity("CRITICAL");
            alert.setMessage("Doctor " + doctor.getFullName() + " has exceeded the 24h prescription threshold.");
            systemAlertRepository.save(alert);
        }

        return prescriptionRepository.save(prescription);
    }

    @Transactional
    public Prescription publishPrescription(Long id) throws IOException {
        Prescription prescription = prescriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Prescription not found"));

        if (prescription.isDraft()) {
            prescription.setDraft(false);
            String fileName = pdfService.generatePrescriptionPdf(prescription);
            prescription.setFilePath(fileName);
            return prescriptionRepository.save(prescription);
        }
        return prescription;
    }

    @Transactional
    public Prescription updatePrescription(Long id, Prescription newDetails, String changeReason, String modifiedBy)
            throws IOException {
        Prescription existing = prescriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Prescription not found with id " + id));

        if (existing.getStatus() == Prescription.PrescriptionStatus.ISSUED || 
            existing.getStatus() == Prescription.PrescriptionStatus.PROCEEDED_TO_PHARMACIST || 
            existing.getStatus() == Prescription.PrescriptionStatus.DISPENSED) {
            throw new RuntimeException("Prescription is immutable and cannot be updated once issued.");
        }

        existing.setDraft(newDetails.isDraft());
        if (newDetails.getPatientEmail() != null)
            existing.setPatientEmail(newDetails.getPatientEmail());

        existing.getItems().clear();
        if (newDetails.getItems() != null) {
            for (PrescriptionItem item : newDetails.getItems()) {
                item.setPrescription(existing);
                existing.getItems().add(item);
            }
        }

        Prescription saved = prescriptionRepository.save(existing);
        return saved;
    }

    @Transactional
    public Prescription broadcastStatusChange(Prescription prescription, Prescription.PrescriptionStatus newStatus,
            String action, String triggeredByEmail) {
        prescription.setStatus(newStatus);
        if (newStatus == Prescription.PrescriptionStatus.DISPENSED) {
            prescription.setDispensed(true);
            prescription.setDispensedAt(java.time.LocalDateTime.now());
        }

        Prescription saved = prescriptionRepository.save(prescription);

        // Send notifications separately — failures here must NOT roll back the save
        try {
            if (newStatus == Prescription.PrescriptionStatus.ISSUED) {
                if (saved.getPatient() != null) {
                    notificationService.createNotification(saved.getPatient(),
                            "Your doctor has issued a new prescription.", "NEW_PRESCRIPTION");
                    
                    // NEW: Generate Adherence Matrix DoseLogs (3/day)
                    generateDoseMatrix(saved);
                }

                if (saved.getPharmacist() != null) {
                    notificationService.createNotification(saved.getPharmacist(),
                            "New prescription request from Dr. "
                                    + (saved.getDoctor() != null ? saved.getDoctor().getFullName() : "Unknown")
                                    + " for Patient "
                                    + (saved.getPatient() != null ? saved.getPatient().getFullName() : "Unknown"),
                            "NEW_PRESCRIPTION");
                } else {
                    List<User> pharmacists = userRepository.findByRole(com.medical.backend.entity.Role.PHARMACIST);
                    for (User pharmacist : pharmacists) {
                        notificationService.createNotification(pharmacist,
                                "New prescription #" + saved.getId() + " has been issued.", "NEW_PRESCRIPTION");
                    }
                }
            } else if (newStatus == Prescription.PrescriptionStatus.PROCEEDED_TO_PHARMACIST) {
                if (saved.getPatient() != null) {
                    notificationService.createNotification(saved.getPatient(),
                            "Your pharmacist has accepted the request and is preparing your medication.",
                            "PHARMACY_PREPARING");
                }
            } else if (newStatus == Prescription.PrescriptionStatus.DISPENSED) {
                if (saved.getPatient() != null) {
                    notificationService.createNotification(saved.getPatient(),
                            "Your prescription #" + saved.getId() + " has been dispensed.", "DISPENSED");
                }
                if (saved.getDoctor() != null) {
                    String medName = saved.getItems() != null && !saved.getItems().isEmpty()
                            ? saved.getItems().get(0).getMedicineName()
                            : "medication";
                    notificationService.createNotification(saved.getDoctor(),
                            "Patient " + (saved.getPatient() != null ? saved.getPatient().getFullName() : "Unknown")
                                    + " has collected " + medName + ". Treatment has officially commenced.",
                            "FULFILLMENT_COMPLETED");
                }
            }
        } catch (Exception e) {
            // Notification failure is non-fatal — log it but return the saved prescription
            System.err.println(
                    "[WARN] Notification dispatch failed after status change to " + newStatus + ": " + e.getMessage());
        }
        return saved;
    }

    public Prescription validatePrescription(Long id, Long pharmacistId) {
        Prescription existing = prescriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Prescription not found with id " + id));

        if (existing.getDoctor() == null) {
            throw new RuntimeException("Prescription #" + id + " has no assigned doctor.");
        }

        existing.setDigitalSignature(UUID.randomUUID().toString());

        if (existing.getFilePath() == null || existing.getFilePath().isEmpty()) {
            try {
                existing.setDraft(false);
                String fileName = pdfService.generatePrescriptionPdf(existing);
                existing.setFilePath(fileName);
            } catch (Exception e) {
                System.err.println("[WARN] PDF generation failed for prescription #" + id + ": " + e.getMessage());
                e.printStackTrace();
            }
        }

        userRepository.findById(pharmacistId).ifPresent(existing::setPharmacist);

        String doctorEmail = existing.getDoctor().getEmail();
        return broadcastStatusChange(existing, Prescription.PrescriptionStatus.ISSUED, "Doctor Issued Prescription",
                doctorEmail);
    }

    public Prescription getPrescription(Long id) {
        return prescriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Prescription not found with id " + id));
    }

    public Prescription getPrescription(Long id, String userEmail) {
        Prescription prescription = getPrescription(id);

        boolean isPatient = prescription.getPatient() != null && prescription.getPatient().getEmail().equals(userEmail);
        boolean isDoctor = prescription.getDoctor() != null && prescription.getDoctor().getEmail().equals(userEmail);

        if (!isPatient && !isDoctor) {
            throw new RuntimeException("Unauthorized access to prescription");
        }
        return prescription;
    }

    public List<Prescription> getPrescriptionsByPatientId(Long patientId) {
        return prescriptionRepository.findByPatientIdSorted(patientId);
    }
    
    public List<Prescription> getPrescriptionsByDoctorId(Long doctorId) {
        return prescriptionRepository.findByDoctorIdSorted(doctorId);
    }

    public List<PrescriptionAudit> getAuditHistory(Long prescriptionId, String userEmail) {
        Prescription prescription = getPrescription(prescriptionId);

        boolean isPatient = prescription.getPatient() != null && prescription.getPatient().getEmail().equals(userEmail);
        boolean isDoctor = prescription.getDoctor() != null && prescription.getDoctor().getEmail().equals(userEmail);
        User user = userRepository.findByEmail(userEmail).orElseThrow(() -> new RuntimeException("User not found"));
        boolean isPharmacist = user.getRole() == com.medical.backend.entity.Role.PHARMACIST;

        if (!isPatient && !isDoctor && !isPharmacist) {
            throw new RuntimeException("Unauthorized access to prescription history");
        }

        return auditRepository.findByPrescriptionIdOrderByModifiedAtDesc(prescriptionId);
    }

    @Autowired
    private NotificationService notificationService;

    @Transactional
    public Prescription dispensePrescription(Long id, String pharmacistEmail) throws IOException {
        Prescription existing = prescriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Prescription not found with id " + id));

        if (existing.getStatus() != Prescription.PrescriptionStatus.PROCEEDED_TO_PHARMACIST) {
            throw new RuntimeException("Only PROCEEDED_TO_PHARMACIST prescriptions can be dispensed.");
        }

        if (existing.getItems() != null) {
            for (PrescriptionItem item : existing.getItems()) {
                inventoryService.decrementStock(item.getMedicineName(), 1); // Assuming 1 unit per prescription item for
                                                                            // now, or use item quantity if available
            }
        }

        return broadcastStatusChange(existing, Prescription.PrescriptionStatus.DISPENSED, "Prescription Dispensed",
                pharmacistEmail);
    }

    public List<Prescription> getPrescriptionsForPharmacist(String pharmacistEmail) {
        User pharmacist = userRepository.findByEmail(pharmacistEmail)
                .orElseThrow(() -> new RuntimeException("Pharmacist not found"));

        return prescriptionRepository.findByStatusInOrderByIdDesc(
                java.util.List.of(
                    Prescription.PrescriptionStatus.ISSUED,
                    Prescription.PrescriptionStatus.PROCEEDED_TO_PHARMACIST,
                    Prescription.PrescriptionStatus.DISPENSED))
                .stream()
                .filter(p -> p.getPharmacist() == null || p.getPharmacist().getId().equals(pharmacist.getId()))
                .collect(Collectors.toList());
    }

    public com.medical.backend.dto.DoctorAnalyticsDTO getDoctorAnalytics(Long doctorId) {
        com.medical.backend.dto.DoctorAnalyticsDTO analytics = new com.medical.backend.dto.DoctorAnalyticsDTO();

        analytics.setTotalPrescriptions(prescriptionRepository.countByDoctor_Id(doctorId));
        analytics.setPendingCount(
                prescriptionRepository.countByDoctor_IdAndStatus(doctorId, Prescription.PrescriptionStatus.PENDING));
        analytics.setApprovedCount(
                prescriptionRepository.countByDoctor_IdAndStatus(doctorId, Prescription.PrescriptionStatus.ISSUED));
        analytics.setDispensedCount(
                prescriptionRepository.countByDoctor_IdAndStatus(doctorId, Prescription.PrescriptionStatus.DISPENSED));

        analytics.setActivePatientsCount(getMyPatients(doctorId).size());
        analytics.setAdherenceRate(85.0);

        return analytics;
    }

    public List<com.medical.backend.entity.User> getMyPatients(Long doctorId) {
        return prescriptionRepository.findDistinctPatientsByDoctorId(doctorId);
    }

    public void logSafetyView(Long prescriptionId, String userEmail) {
        Prescription p = getPrescription(prescriptionId);
        com.medical.backend.entity.PrescriptionAudit audit = new com.medical.backend.entity.PrescriptionAudit();
        audit.setPrescriptionId(prescriptionId);
        audit.setActionType("VIEWED_SAFETY_GUIDE");
        audit.setModifiedBy(userEmail);
        audit.setChangeReason("Clinical Intelligence Guide Viewed");
        audit.setAuditData("User viewed clinical intelligence guide and contraindication alerts for " +
                (p.getItems() != null && !p.getItems().isEmpty() ? p.getItems().get(0).getMedicineName()
                        : "medication"));
        auditRepository.save(audit);
        System.out.println(
                "[AUDIT] Safety information view logged for Prescription #" + prescriptionId + " by " + userEmail);
    }

    public void validatePrescriptionItem(String drugName, String patientEmail) {
        User patient = userRepository.findByEmail(patientEmail)
                .orElseThrow(() -> new RuntimeException("Patient with email " + patientEmail + " not found."));

        PrescriptionItem tempItem = new PrescriptionItem();
        tempItem.setMedicineName(drugName);
        List<PrescriptionItem> items = new ArrayList<>();
        items.add(tempItem);

        // Comprehensive Safety Gate check
        safetyGateValidator.validateSafety(items, patient);
    }

    /**
     * Returns a complete, grouped, delta-enriched audit timeline for a patient.
     * Ported from AdminService to allow patient-facing access.
     */
    public List<PatientAuditDTO> getPatientAuditTimeline(Long patientId) {
        List<Prescription> patientPrescriptions = prescriptionRepository.findByPatient_Id(patientId);
        List<PatientAuditDTO> result = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

        for (Prescription rx : patientPrescriptions) {
            List<PrescriptionAudit> audits = auditRepository.findByPrescriptionIdOrderByModifiedAtAsc(rx.getId());
            if (audits.isEmpty()) continue;

            PatientAuditDTO dto = new PatientAuditDTO();
            dto.setPrescriptionId(rx.getId());
            dto.setPatientName(rx.getPatient() != null ? rx.getPatient().getFullName() : "Unknown");

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

            Collections.reverse(versions);
            dto.setVersions(versions);
            result.add(dto);
        }

        result.sort((a, b) -> {
            String aTime = a.getVersions().isEmpty() ? "" : a.getVersions().get(0).getModifiedAt();
            String bTime = b.getVersions().isEmpty() ? "" : b.getVersions().get(0).getModifiedAt();
            if (aTime == null) aTime = "";
            if (bTime == null) bTime = "";
            return bTime.compareTo(aTime);
        });

        return result;
    }

    public void generateDoseMatrix(Prescription prescription) {
        if (prescription.getItems() == null || prescription.getItems().isEmpty())
            return;

        // Use the first item's duration for simplicity, or find the longest duration
        PrescriptionItem representative = prescription.getItems().get(0);
        java.time.LocalDate start = representative.getItemStartDate();
        java.time.LocalDate end = representative.getEndDate();

        if (start == null) start = java.time.LocalDate.now();
        if (end == null) end = start.plusDays(7); // Default to 7 days if not specified

        java.time.LocalDate current = start;
        
        // Collect all prescribed slots across all items for this matrix
        java.util.Set<String> activeSlots = new java.util.HashSet<>();
        for (PrescriptionItem item : prescription.getItems()) {
            if (item.getMealSlots() != null && !item.getMealSlots().trim().isEmpty()) {
                for (String s : item.getMealSlots().split(",")) {
                    String trimmed = s.trim().toUpperCase();
                    if (!trimmed.isEmpty()) {
                        activeSlots.add(trimmed);
                    }
                }
            }
        }
        
        String frequency = representative.getFrequency() != null ? representative.getFrequency().toUpperCase() : "DAILY";
        String customDays = representative.getDaysOfWeek() != null ? representative.getDaysOfWeek().toUpperCase() : "";

        int dayIndex = 0;
        while (!current.isAfter(end)) {
            boolean shouldGenerate = false;

            if (frequency.equals("DAILY")) {
                shouldGenerate = true;
            } else if (frequency.equals("ALTERNATE_DAY") || frequency.equals("ALTERNATE")) {
                shouldGenerate = (dayIndex % 2 == 0);
            } else if (frequency.equals("CUSTOM")) {
                String dayName = current.getDayOfWeek().name().substring(0, 3); // "MON", "TUE"
                shouldGenerate = customDays.contains(dayName);
            } else {
                shouldGenerate = true; // Fallback
            }

            if (shouldGenerate) {
                for (com.medical.backend.entity.MealType mealType : com.medical.backend.entity.MealType.values()) {
                    // If specific slots are prescribed, only generate those.
                    if (!activeSlots.isEmpty() && !activeSlots.contains(mealType.name())) {
                        continue; 
                    }
                    
                    com.medical.backend.entity.DoseLog log = new com.medical.backend.entity.DoseLog();
                    log.setPrescription(prescription);
                    log.setPrescriptionId(prescription.getId());
                    log.setPatient(prescription.getPatient());
                    log.setDate(current);
                    log.setMeal(mealType);
                    log.setTaken(false);
                    
                    // Map to legacy mealSlot for backward compatibility UI
                    log.setMealSlot(mealType.name());
                    
                    // Set a mock scheduled time for the legacy scheduler
                    int hour = (mealType == com.medical.backend.entity.MealType.BREAKFAST) ? 8 :
                               (mealType == com.medical.backend.entity.MealType.LUNCH) ? 13 : 20;
                    log.setScheduledTime(current.atTime(hour, 0));
                    
                    doseLogRepository.save(log);
                }
            }
            current = current.plusDays(1);
            dayIndex++;
        }
        System.out.println("[ADHERENCE] Generated dose matrix for Prescription #" + prescription.getId() + " from " + start + " to " + end);
    }
}
