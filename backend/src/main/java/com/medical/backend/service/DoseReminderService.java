package com.medical.backend.service;

import com.medical.backend.dto.DoseLogDTO;
import com.medical.backend.entity.User;
import com.medical.backend.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class DoseReminderService {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationRepository notificationRepository;

    public void checkAndNotifyPatient(User patient, List<DoseLogDTO> todaysDoses) {
        if (patient == null || todaysDoses == null || todaysDoses.isEmpty()) {
            return;
        }

        long pendingToday = todaysDoses.stream()
                .filter(d -> "PENDING".equalsIgnoreCase(d.getStatus()) || "SNOOZED".equalsIgnoreCase(d.getStatus()))
                .count();

        if (pendingToday > 0) {
            String todayStr = LocalDate.now().toString();
            String type = "DOSE_REMINDER";
            
            // Check if reminder already sent today
            boolean exists = notificationRepository.findByUser_IdOrderByCreatedAtDesc(patient.getId()).stream()
                    .anyMatch(n -> type.equals(n.getType()) && n.getCreatedAt().toLocalDate().toString().equals(todayStr));

            if (!exists) {
                String message = String.format("You have %d pending medication doses for today. Please log them in your dashboard.", pendingToday);
                notificationService.createNotification(patient, message, type);
                System.out.println("[REMINDER] Daily dose reminder sent to Patient: " + patient.getEmail());
            }
        }
    }
}
