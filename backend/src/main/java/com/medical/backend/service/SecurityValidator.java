package com.medical.backend.service;

import com.medical.backend.dto.DrugProfileDTO;
import com.medical.backend.entity.User;
import com.medical.backend.exception.ClinicalSafetyException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SecurityValidator {

    private final ExternalDrugService externalDrugService;

    public void validateSafety(String drugName, User patient) {
        DrugProfileDTO profile = externalDrugService.fetchDrugProfile(drugName);
        String history = patient.getMedicalHistory() != null ? patient.getMedicalHistory().toLowerCase() : "";

        // Check Contraindications against Medical History
        for (String contra : profile.getContraindications()) {
            String lowerContra = contra.toLowerCase();

            // Critical Safety Checks (Hypertension / Blood Pressure)
            if (lowerContra.contains("hypertension") || lowerContra.contains("blood pressure")) {
                if (history.contains("hypertension") || history.contains("high blood pressure")) {
                    throw new ClinicalSafetyException("Hypertension Conflict", null);
                }
            }

            // Pregnancy Safety
            if (lowerContra.contains("pregnancy") || Boolean.TRUE.equals(profile.getPregnancyWarning())) {
                if (history.contains("pregnant") || history.contains("pregnancy")) {
                    throw new ClinicalSafetyException("Pregnancy Safety Alert", null);
                }
            }

            // Generic keyword matching for other conditions
            List<String> keywords = List.of("diabetes", "kidney", "renal", "liver", "hepatic", "asthma", "heart", "cardiac", "gastric", "ulcer");
            for (String kw : keywords) {
                if (lowerContra.contains(kw) && history.contains(kw)) {
                    throw new ClinicalSafetyException("Clinical Alert: " + kw, null);
                }
            }
        }
    }
}
