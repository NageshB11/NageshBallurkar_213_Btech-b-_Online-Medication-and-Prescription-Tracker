package com.medical.backend.service;

import com.medical.backend.dto.DrugProfileDTO;
import com.medical.backend.dto.SafetyReportDTO;
import com.medical.backend.entity.PrescriptionItem;
import com.medical.backend.entity.User;
import com.medical.backend.exception.ClinicalSafetyException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SafetyGateValidator {

    private final ExternalDrugService externalDrugService;
    private final InteractionService interactionService;

    public void validateSafety(List<PrescriptionItem> newItems, User patient) {
        validateSafety(newItems, patient, false);
    }

    public void validateSafety(List<PrescriptionItem> newItems, User patient, boolean overrideInteraction) {
        List<String> allergyConflicts = new ArrayList<>();
        List<String> conditionConflicts = new ArrayList<>();
        List<String> severeInteractions = new ArrayList<>();
        List<String> moderateInteractions = new ArrayList<>();
        List<String> minorInteractions = new ArrayList<>();

        String history = patient.getMedicalHistory() != null ? patient.getMedicalHistory().toLowerCase() : "";
        String allergies = patient.getAllergies() != null ? patient.getAllergies().toLowerCase() : "";

        for (PrescriptionItem newItem : newItems) {
            String drugName = newItem.getMedicineName();
            DrugProfileDTO profile = externalDrugService.fetchDrugProfile(drugName);
            
            // 1. Biological Guard: History & Allergies
            for (String contra : profile.getContraindications()) {
                String lowerContra = contra.toLowerCase();
                
                // Allergy Check
                if (isMatch(lowerContra, allergies)) {
                    allergyConflicts.add("Patient Allergy Match: " + drugName + " contraindicates with " + contra);
                }
                
                // Condition Check
                if (isMatch(lowerContra, history)) {
                    conditionConflicts.add("Condition Conflict: " + drugName + " contraindicates with patient history of " + contra);
                }
            }
        }

        // 2. Interaction Guard: DDI
        try {
            SafetyReportDTO interactionReport = interactionService.validateInteractions(newItems, patient);
            if (interactionReport != null) {
                if (interactionReport.getSevereInteractions() != null) severeInteractions.addAll(interactionReport.getSevereInteractions());
                if (interactionReport.getModerateInteractions() != null) moderateInteractions.addAll(interactionReport.getModerateInteractions());
                if (interactionReport.getMinorInteractions() != null) minorInteractions.addAll(interactionReport.getMinorInteractions());
            }
        } catch (Exception e) {
            log.error("Failed to run real-time RxNav validation", e);
        }

        if (!minorInteractions.isEmpty()) {
            minorInteractions.forEach(m -> log.info("Minor Advisory logged: {}", m));
        }

        boolean blockForInteraction = false;
        if (!severeInteractions.isEmpty()) {
            blockForInteraction = true;
        } else if (!moderateInteractions.isEmpty() && !overrideInteraction) {
            blockForInteraction = true;
        }

        if (!allergyConflicts.isEmpty() || !conditionConflicts.isEmpty() || blockForInteraction) {
            StringBuilder summaryBuilder = new StringBuilder("Critical Clinical Conflict Detected:");
            if (!allergyConflicts.isEmpty()) {
                summaryBuilder.append("\n- ").append(String.join("\n- ", allergyConflicts));
            }
            if (!conditionConflicts.isEmpty()) {
                summaryBuilder.append("\n- ").append(String.join("\n- ", conditionConflicts));
            }
            if (!severeInteractions.isEmpty()) {
                summaryBuilder.append("\n- ").append(String.join("\n- ", severeInteractions));
            }
            if (!moderateInteractions.isEmpty() && !overrideInteraction) {
                summaryBuilder.append("\n- ").append(String.join("\n- ", moderateInteractions));
            }

            SafetyReportDTO report = SafetyReportDTO.builder()
                    .isSafe(false)
                    .allergyConflicts(allergyConflicts)
                    .conditionConflicts(conditionConflicts)
                    .severeInteractions(severeInteractions)
                    .moderateInteractions(moderateInteractions)
                    .minorInteractions(minorInteractions)
                    .summary(summaryBuilder.toString())
                    .build();
            
            log.warn("Safety Gate Blocked: \n{}", report.getSummary());
            throw new ClinicalSafetyException(report.getSummary(), report);
        }
    }

    private boolean isMatch(String contra, String patientInfo) {
        if (patientInfo.isEmpty()) return false;
        List<String> keywords = List.of(patientInfo.split("[,;\\s]+"));
        for (String kw : keywords) {
            if (kw.length() > 3 && contra.contains(kw.toLowerCase())) {
                return true;
            }
        }
        return false;
    }
}
