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

    public List<Medicine> getAllMedicines() {
        return medicineRepository.findAll();
    }

    public Medicine addOrUpdateMedicine(Medicine medicine) {
        return medicineRepository.findByName(medicine.getName())
                .map(existing -> {
                    existing.setStockQuantity(existing.getStockQuantity() + medicine.getStockQuantity());
                    existing.setBatchNumber(medicine.getBatchNumber());
                    existing.setExpiryDate(medicine.getExpiryDate());
                    existing.setUnitPrice(medicine.getUnitPrice());
                    return medicineRepository.save(existing);
                })
                .orElseGet(() -> medicineRepository.save(medicine));
    }

    public void decrementStock(String medicineName, int quantity) {
        medicineRepository.findByName(medicineName).ifPresent(medicine -> {
            if (medicine.getStockQuantity() >= quantity) {
                medicine.setStockQuantity(medicine.getStockQuantity() - quantity);
                medicineRepository.save(medicine);
            } else {
                throw new RuntimeException("Insufficient stock for: " + medicineName);
            }
        });
    }
}
