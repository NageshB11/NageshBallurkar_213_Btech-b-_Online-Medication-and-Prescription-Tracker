package com.medical.backend.util;

import com.medical.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

//@Component
public class DataCleanupRunner implements CommandLineRunner {

    @Autowired
    private PrescriptionRepository prescriptionRepo;
    @Autowired
    private PrescriptionItemRepository itemRepo;
    @Autowired
    private DoseLogRepository doseLogRepo;
    @Autowired
    private AdherenceLogRepository adherenceLogRepo;
    @Autowired
    private MedicationScheduleRepository scheduleRepo;
    @Autowired
    private ScheduleItemRepository scheduleItemRepo;
    @Autowired
    private PrescriptionAuditRepository prescriptionAuditRepo;
    @Autowired
    private ScheduleAuditRepository scheduleAuditRepo;
    @Autowired
    private SystemAuditRepository systemAuditRepo;
    @Autowired
    private RenewalRequestRepository renewalRequestRepo;
    @Autowired
    private AlertLogRepository alertLogRepo;
    @Autowired
    private NotificationRepository notificationRepo;
    @Autowired
    private AppointmentRepository appointmentRepo;
    @Autowired
    private HealthVitalsRepository healthVitalsRepo;
    @Autowired
    private PatientMealPrefsRepository mealPrefsRepo;
    @Autowired
    private SystemAlertRepository systemAlertRepo;
    @Autowired
    private StockAlertRepository stockAlertRepo;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        System.out.println("⚠️ DATA CLEANUP INITIATED ⚠️");
        
        doseLogRepo.deleteAll();
        adherenceLogRepo.deleteAll();
        
        // Delete dependents first
        renewalRequestRepo.deleteAll();
        alertLogRepo.truncateTable();
        notificationRepo.deleteAll();
        appointmentRepo.deleteAll();
        healthVitalsRepo.deleteAll();
        mealPrefsRepo.deleteAll();
        systemAlertRepo.deleteAll();
        stockAlertRepo.deleteAll();
        
        prescriptionAuditRepo.deleteAll();
        scheduleAuditRepo.deleteAll();
        systemAuditRepo.deleteAll();
        scheduleItemRepo.deleteAll();
        scheduleRepo.deleteAll();
        itemRepo.deleteAll();
        prescriptionRepo.deleteAll();
        
        System.out.println("✅ ALL PRESCRIPTIONS AND LOGS DELETED ✅");
    }
}
