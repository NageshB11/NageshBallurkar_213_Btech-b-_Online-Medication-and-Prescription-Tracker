package com.medical.backend.service;

import com.medical.backend.entity.Prescription;
import com.medical.backend.repository.PrescriptionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class ReminderService {

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @Autowired
    private NotificationService notificationService;

    // Run every day at 8 AM
    @Scheduled(cron = "0 0 8 * * ?")
    public void sendExpiryReminders() {
        List<Prescription> prescriptions = prescriptionRepository.findAll();
        LocalDate today = LocalDate.now();
        LocalDate warningDate = today.plusDays(7);

        for (Prescription p : prescriptions) {
            if (p.getStatus() == Prescription.PrescriptionStatus.ISSUED
                    || p.getStatus() == Prescription.PrescriptionStatus.DISPENSED) {

                // Assuming default 30 days validity for now as expiryDate was removed
                LocalDate expiry = p.getCreatedAt().toLocalDate().plusDays(30);

                if (expiry.isEqual(warningDate)) {
                    if (p.getPatient() != null) {
                        notificationService.createNotification(
                                p.getPatient(),
                                "Your prescription #" + p.getId() + " expires in 7 days. Please request a renewal.",
                                "WARNING");
                    }
                } else if (expiry.isEqual(today)) {
                    if (p.getPatient() != null) {
                        notificationService.createNotification(
                                p.getPatient(),
                                "Your prescription #" + p.getId() + " expires TODAY.",
                                "CRITICAL");
                    }
                }
            }
        }
    }
}
