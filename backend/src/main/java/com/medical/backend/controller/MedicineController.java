package com.medical.backend.controller;

import com.medical.backend.entity.Medicine;
import com.medical.backend.service.MedicineService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pharmacist/inventory")
@CrossOrigin(origins = "*")
public class MedicineController {

    @Autowired
    private MedicineService medicineService;

    @GetMapping
    public List<Medicine> getInventory() {
        return medicineService.getAllMedicines();
    }

    @PostMapping("/update")
    public ResponseEntity<?> updateInventory(@RequestBody Medicine medicine) {
        try {
            return ResponseEntity.ok(medicineService.addOrUpdateMedicine(medicine));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
