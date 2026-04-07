package com.medical.backend.controller;

import com.medical.backend.dto.PharmacyIntelligenceDTO;
import com.medical.backend.service.PharmacyAnalyticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/pharma/analytics")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class PharmacyAnalyticsController {

    @Autowired
    private PharmacyAnalyticsService pharmacyAnalyticsService;

    @GetMapping("/inventory-insights")
    public ResponseEntity<PharmacyIntelligenceDTO> getInventoryInsights() {
        return ResponseEntity.ok(pharmacyAnalyticsService.getPharmacyIntelligence());
    }
}
