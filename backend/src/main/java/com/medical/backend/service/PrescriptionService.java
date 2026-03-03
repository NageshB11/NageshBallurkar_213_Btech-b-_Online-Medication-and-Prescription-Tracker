package com.medical.backend.service;

import com.medical.backend.entity.Prescription;
import com.medical.backend.entity.PrescriptionAudit;
import com.medical.backend.entity.PrescriptionItem;
import com.medical.backend.repository.PrescriptionAuditRepository;
import com.medical.backend.entity.User;
import com.medical.backend.repository.PrescriptionRepository;
import com.medical.backend.repository.UserRepository;
import com.medical.backend.repository.SystemAlertRepository;
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

    @Transactional
    public Prescription createPrescription(Prescription prescription) throws IOException {
        if (!prescription.isDraft()) {
            String fileName = pdfService.generatePrescriptionPdf(prescription);
            prescription.setFilePath(fileName);
            prescription.setStatus(Prescription.PrescriptionStatus.PENDING);
        } else {
            prescription.setStatus(Prescription.PrescriptionStatus.PENDING);
        }

        if (prescription.getPatientEmail() != null && !prescription.getPatientEmail().isEmpty()) {
            userRepository.findByEmail(prescription.getPatientEmail())
                    .ifPresent(prescription::setPatient);
        }

        if (prescription.getItems() != null) {
            for (PrescriptionItem item : prescription.getItems()) {
                item.setPrescription(prescription);
            }
        }

        // Anomaly Detection
        if (prescription.getDoctor() != null) {
            if (anomalyDetectionService.checkAnomaly(prescription.getDoctor().getId())) {
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

    @Transactional
    public Prescription validatePrescription(Long id, Long pharmacistId) {
        if (pharmacistId == null) {
            throw new RuntimeException("Pharmacist must be selected to issue the prescription.");
        }

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
        return prescriptionRepository.findByPatient_Id(patientId);
    }

    public List<Prescription> getPrescriptionsByDoctorId(Long doctorId) {
        return prescriptionRepository.findAll().stream()
                .filter(p -> p.getDoctor() != null && p.getDoctor().getId().equals(doctorId))
                .collect(Collectors.toList());
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

        return broadcastStatusChange(existing, Prescription.PrescriptionStatus.DISPENSED, "Prescription Dispensed",
                pharmacistEmail);
    }

    public List<Prescription> getPrescriptionsForPharmacist(String pharmacistEmail) {
        User pharmacist = userRepository.findByEmail(pharmacistEmail)
                .orElseThrow(() -> new RuntimeException("Pharmacist not found"));

        return prescriptionRepository.findAll().stream()
                .filter(p -> (p.getStatus() == Prescription.PrescriptionStatus.ISSUED
                        || p.getStatus() == Prescription.PrescriptionStatus.PROCEEDED_TO_PHARMACIST
                        || p.getStatus() == Prescription.PrescriptionStatus.DISPENSED))
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
}
