package com.medical.backend.service;

import com.medical.backend.dto.DrugProfileDTO;
import com.medical.backend.entity.DoseLog;
import com.medical.backend.entity.Notification;
import com.medical.backend.repository.DoseLogRepository;
import com.medical.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MissedDoseTrackingService {

    private final DoseLogRepository doseLogRepository;
    private final NotificationRepository notificationRepository;
    private final ExternalDrugService externalDrugService;

    /**
     * Proactive Alert Logic: Every hour, check for missed doses.
     * If a patient misses a dose (pending > 1 hour), trigger a notification with a
     * clinical tip.
     */
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void runMissedDoseSafetyCheck() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(1);
        List<DoseLog> pendingLateDoses = doseLogRepository.findByStatusAndScheduledTimeBefore(
                DoseLog.DoseStatus.PENDING, threshold);

        for (DoseLog dose : pendingLateDoses) {
            dose.setStatus(DoseLog.DoseStatus.MISSED);
            doseLogRepository.save(dose);

            // Fetch Clinical Tip from OpenFDA via ExternalDrugService
            String drugName = dose.getScheduleItem().getMedicine().getName();
            DrugProfileDTO profile = externalDrugService.fetchDrugProfile(drugName);
            String clinicalTip = profile.getMissedDoseTip();

            // Dispatch Proactive Push Notification (Simulated through notification entity)
            Notification alert = new Notification();
            alert.setUser(dose.getPatient());
            alert.setMessage("PROACTIVE ALERT: Missed " + drugName + " dose. Safety Instruction: " + clinicalTip);
            alert.setType("CRITICAL_ALERT");
            alert.setRead(false);
            alert.setCreatedAt(LocalDateTime.now());
            notificationRepository.save(alert);

            System.out.println("[SAFETY] Proactive missed dose alert sent for drug: " + drugName);
        }
    }
}
