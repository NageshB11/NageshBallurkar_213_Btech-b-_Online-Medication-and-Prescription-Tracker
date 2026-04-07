package com.medical.backend.service;

import com.medical.backend.entity.Notification;
import com.medical.backend.entity.Prescription;
import com.medical.backend.entity.User;
import com.medical.backend.repository.NotificationRepository;
import com.medical.backend.repository.PrescriptionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class AdherenceAlertService {

    @Autowired
    private AdherenceAnalyticsService analyticsService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    public void checkAndNotifyDoctor(Long prescriptionId) {
        Prescription prescription = prescriptionRepository.findById(prescriptionId).orElse(null);
        if (prescription == null || prescription.getPatient() == null || prescription.getDoctor() == null) {
            return;
        }

        double adherence = analyticsService.getOverallAdherence(prescription.getPatient().getId());

        // Threshold: 80%
        if (adherence < 80.0) {
            String message = String.format("CRITICAL: Patient %s has dropped to %.1f%% adherence for Prescription #%d (%s).",
                    prescription.getPatient().getFullName(),
                    adherence,
                    prescription.getId(),
                    prescription.getItems().get(0).getMedicineName());

            notificationService.createNotification(prescription.getDoctor(), message, "CRITICAL_ADHERENCE");
            System.out.println("[ALERT] Low adherence notification sent to Dr. " + prescription.getDoctor().getEmail());
        }
    }
}
