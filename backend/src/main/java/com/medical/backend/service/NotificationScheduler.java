package com.medical.backend.service;

import com.medical.backend.entity.Notification;
import com.medical.backend.entity.Prescription;
import com.medical.backend.entity.PrescriptionItem;
import com.medical.backend.repository.NotificationRepository;
import com.medical.backend.repository.PrescriptionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationScheduler {

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    // Run every minute
    @Scheduled(cron = "0 * * * * *")
    @Transactional
    public void scheduleMedicationReminders() {
        // Fetch all approved prescriptions
        List<Prescription> activePrescriptions = prescriptionRepository
                .findByStatus(Prescription.PrescriptionStatus.ISSUED);

        // Get current time formatted to 12-hour format with AM/PM (e.g., "08:00 AM")
        // Note: Use 'hh' for 1-12, 'a' for AM/PM. Ensure user input matches this or
        // normalize.
        // Assuming strict "08:00 AM" format from input.
        LocalTime now = LocalTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("hh:mm a");
        String currentTime = now.format(formatter).toUpperCase();

        // Also support "HH:mm" (24h) if that's what is stored.
        // Let's print to console for debug in development
        // System.out.println("Scheduler checking for time: " + currentTime);

        for (Prescription prescription : activePrescriptions) {
            if (prescription.getItems() == null)
                continue;

            for (PrescriptionItem item : prescription.getItems()) {
                if (item.getDosageTiming() != null && item.getDosageTiming().equalsIgnoreCase(currentTime)) {
                    // Create Notification
                    Notification notification = new Notification();
                    notification.setUser(prescription.getPatient());
                    notification.setMessage(
                            "Time to take your medication: " + item.getMedicineName() + " - " + item.getDosage());
                    notification.setType("REMINDER");
                    notification.setRead(false);
                    notification.setCreatedAt(java.time.LocalDateTime.now());

                    notificationRepository.save(notification);
                    System.out.println("Notification sent to " + prescription.getPatient().getFullName() + " for "
                            + item.getMedicineName());
                }
            }
        }
    }
}
