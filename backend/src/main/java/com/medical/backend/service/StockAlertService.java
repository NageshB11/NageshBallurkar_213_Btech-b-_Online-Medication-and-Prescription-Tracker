package com.medical.backend.service;

import com.medical.backend.entity.Medicine;
import com.medical.backend.entity.StockAlert;
import com.medical.backend.entity.User;
import com.medical.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class StockAlertService {

    @Autowired
    private StockAlertRepository alertRepo;
    @Autowired
    private ScheduleItemRepository itemRepo;
    @Autowired
    private MedicineRepository medicineRepo;
    @Autowired
    private NotificationService notificationService;
    @Autowired
    private UserRepository userRepo;

    /**
     * Call this from PharmacistService whenever medicine stock changes.
     */
    @Transactional
    public void checkAndRaiseAlerts(Long medicineId, int newStock) {
        Medicine medicine = medicineRepo.findById(medicineId)
                .orElseThrow(() -> new RuntimeException("Medicine not found"));

        if (newStock > 0)
            return; // no alert needed

        // Avoid duplicate unresolved alerts
        if (alertRepo.existsByMedicine_IdAndIsResolvedFalse(medicineId))
            return;

        StockAlert alert = new StockAlert();
        alert.setMedicine(medicine);
        alert.setAlertType(StockAlert.AlertType.OUT_OF_STOCK);
        alertRepo.save(alert);

        // Notify all pharmacists
        userRepo.findAll().stream()
                .filter(u -> u.getRole() != null && u.getRole().name().equals("PHARMACIST"))
                .forEach(pharmacist -> notificationService.createNotification(pharmacist,
                        "⚠️ OUT OF STOCK: " + medicine.getName() + " — patients have active schedules",
                        "CRITICAL"));

        // Notify affected patients
        List<User> affectedPatients = itemRepo.findPatientsByActiveMedicine(medicineId);
        for (User patient : affectedPatients) {
            notificationService.createNotification(patient,
                    medicine.getName() + " is currently out of stock in pharmacy. Please contact your pharmacist.",
                    "WARNING");
        }
    }

    @Transactional
    public StockAlert resolveAlert(Long alertId) {
        StockAlert alert = alertRepo.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alert not found"));
        alert.setResolved(true);
        alert.setResolvedAt(LocalDateTime.now());
        return alertRepo.save(alert);
    }

    public List<StockAlert> getActiveAlerts() {
        return alertRepo.findByIsResolvedFalseOrderByRaisedAtDesc();
    }
}
