package com.medical.backend.service;

import com.medical.backend.entity.PrescriptionItem;
import com.medical.backend.entity.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.ArrayList;
import com.medical.backend.dto.SafetyReportDTO;

@Service
@Slf4j
public class InteractionService {

    @Autowired
    private DrugDetailService drugDetailService;

    @Autowired
    private com.medical.backend.repository.PrescriptionRepository prescriptionRepo;

    private final org.springframework.web.client.RestTemplate restTemplate;
    private static final String RXNAV_INTERACTION_URL = "https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=";

    {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(5000);
        restTemplate = new org.springframework.web.client.RestTemplate(factory);
    }

    public SafetyReportDTO validateInteractions(List<PrescriptionItem> newItems, User patient) {
        SafetyReportDTO report = new SafetyReportDTO();
        report.setSevereInteractions(new ArrayList<>());
        report.setModerateInteractions(new ArrayList<>());
        report.setMinorInteractions(new ArrayList<>());

        log.info("Running Real-Time RxNav Interaction Check for patient: {}", patient.getEmail());
        
        List<com.medical.backend.entity.Prescription> activePrescriptions = prescriptionRepo.findByPatientAndStatus(patient, 
            com.medical.backend.entity.Prescription.PrescriptionStatus.ISSUED);
        activePrescriptions.addAll(prescriptionRepo.findByPatientAndStatus(patient, 
            com.medical.backend.entity.Prescription.PrescriptionStatus.APPROVED));

        List<String> rxcuis = new java.util.ArrayList<>();
        
        // Collect existing CUIs
        for (com.medical.backend.entity.Prescription p : activePrescriptions) {
            for (PrescriptionItem item : p.getItems()) {
                if (item.getRxcui() != null && !item.getRxcui().equals("N/A")) {
                    rxcuis.add(item.getRxcui());
                }
            }
        }
        
        // Collect new CUIs
        for (PrescriptionItem newItem : newItems) {
            com.medical.backend.dto.DrugInfoDTO metadata = drugDetailService.getDrugDetails(newItem.getMedicineName());
            if (metadata.getRxcui() != null && !metadata.getRxcui().equals("N/A")) {
                rxcuis.add(metadata.getRxcui());
                newItem.setRxcui(metadata.getRxcui());
            }
        }

        if (rxcuis.size() < 2) return report;

        String query = String.join("+", rxcuis);
        try {
            com.fasterxml.jackson.databind.JsonNode response = restTemplate.getForObject(RXNAV_INTERACTION_URL + query, com.fasterxml.jackson.databind.JsonNode.class);
            if (response != null && response.has("fullInteractionTypeGroup")) {
                com.fasterxml.jackson.databind.JsonNode groups = response.get("fullInteractionTypeGroup");
                for (com.fasterxml.jackson.databind.JsonNode group : groups) {
                    for (com.fasterxml.jackson.databind.JsonNode type : group.get("fullInteractionType")) {
                        String comment = type.get("comment").asText();
                        String commentLower = comment.toLowerCase();
                        if (commentLower.contains("severe") || commentLower.contains("fatal") || commentLower.contains("contraindicated")) {
                            log.error("Severe Interaction detected by RxNav: {}", comment);
                            report.getSevereInteractions().add("Severe Conflict: " + comment);
                        } else if (commentLower.contains("moderate") || commentLower.contains("significant") || commentLower.contains("monitor")) {
                            log.warn("Moderate Interaction detected by RxNav: {}", comment);
                            report.getModerateInteractions().add("Moderate Conflict: " + comment);
                        } else {
                            log.info("Minor Interaction detected by RxNav: {}", comment);
                            report.getMinorInteractions().add("Minor Advisory: " + comment);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.warn("RxNav interaction check failed or timed out. Falling back to local safety gates.");
        }

        return report;
    }
}
