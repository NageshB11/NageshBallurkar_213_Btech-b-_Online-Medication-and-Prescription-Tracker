package com.medical.backend.service;

import com.medical.backend.entity.Medicine;
import com.medical.backend.repository.MedicineRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MedicineService {

    @Autowired
    private MedicineRepository medicineRepository;

    @Autowired
    private StockAlertService stockAlertService;

    public List<Medicine> getAllMedicines() {
        return medicineRepository.findAll();
    }

    public Medicine addOrUpdateMedicine(Medicine medicine) {
        Medicine saved = medicineRepository.findByName(medicine.getName())
                .map(existing -> {
                    existing.setStockQuantity(existing.getStockQuantity() + medicine.getStockQuantity());
                    existing.setBatchNumber(medicine.getBatchNumber());
                    existing.setExpiryDate(medicine.getExpiryDate());
                    existing.setUnitPrice(medicine.getUnitPrice());
                    if (medicine.getLowStockThreshold() > 0) {
                        existing.setLowStockThreshold(medicine.getLowStockThreshold());
                    }
                    return medicineRepository.save(existing);
                })
                .orElseGet(() -> medicineRepository.save(medicine));

        // Trigger alert check on replenished stock (resolves existing alerts)
        stockAlertService.checkAndRaiseAlerts(saved.getId(), saved.getStockQuantity());
        return saved;
    }

    public void decrementStock(String medicineName, int quantity) {
        medicineRepository.findByName(medicineName).ifPresent(medicine -> {
            if (medicine.getStockQuantity() >= quantity) {
                medicine.setStockQuantity(medicine.getStockQuantity() - quantity);
                Medicine saved = medicineRepository.save(medicine);
                // Trigger alert check
                stockAlertService.checkAndRaiseAlerts(saved.getId(), saved.getStockQuantity());
            } else {
                System.err.println("[WARN] Insufficient stock in DB for " + medicineName
                        + " (Requested: " + quantity + ", Have: " + medicine.getStockQuantity() + ")");
                // Even if insufficient, if we decrement what's left, we trigger alert
                medicine.setStockQuantity(0);
                Medicine saved = medicineRepository.save(medicine);
                stockAlertService.checkAndRaiseAlerts(saved.getId(), 0);
            }
        });
    }
}
