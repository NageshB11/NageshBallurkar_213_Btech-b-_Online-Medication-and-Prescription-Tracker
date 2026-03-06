package com.medical.backend.controller;

import com.medical.backend.entity.StockAlert;
import com.medical.backend.service.StockAlertService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stock-alerts")
@CrossOrigin(origins = "http://localhost:4200")
public class StockAlertController {

    @Autowired
    private StockAlertService stockAlertService;

    @GetMapping("/active")
    public ResponseEntity<List<StockAlert>> getActiveAlerts() {
        return ResponseEntity.ok(stockAlertService.getActiveAlerts());
    }

    @PatchMapping("/{id}/resolve")
    public ResponseEntity<StockAlert> resolveAlert(@PathVariable Long id) {
        return ResponseEntity.ok(stockAlertService.resolveAlert(id));
    }
}
