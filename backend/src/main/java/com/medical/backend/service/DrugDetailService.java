package com.medical.backend.service;

import com.medical.backend.dto.DrugInfoDTO;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class DrugDetailService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final String FDA_API_URL = "https://api.fda.gov/drug/label.json?search=openfda.brand_name:\"%s\"&limit=1";

    public DrugInfoDTO getDrugDetails(String medicineName) {
        DrugInfoDTO dto = new DrugInfoDTO();
        dto.setBrandName(medicineName); // Fallback

        try {
            String url = String.format(FDA_API_URL, medicineName.replace(" ", "+"));
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode results = root.path("results");
                
                if (results.isArray() && results.size() > 0) {
                    JsonNode openfda = results.get(0).path("openfda");
                    
                    // Identity
                    dto.setBrandName(getFirstArrayElement(openfda, "brand_name", medicineName));
                    dto.setGenericName(getFirstArrayElement(openfda, "generic_name", "Unknown Generic"));
                    dto.setActiveIngredient(getFirstArrayElement(openfda, "substance_name", "Unknown Substance"));
                    
                    // Pharmacist Data
                    dto.setManufacturerName(getFirstArrayElement(openfda, "manufacturer_name", "Unknown Manufacturer"));
                    dto.setProductType(getFirstArrayElement(openfda, "product_type", "Unknown"));
                    dto.setRouteOfAdministration(getFirstArrayElement(openfda, "route", "Oral"));
                    dto.setRxcui(getFirstArrayElement(openfda, "rxcui", "N/A"));
                    dto.setRequiresAuthenticityBadge(dto.getManufacturerName() != null && !dto.getManufacturerName().contains("Unknown"));

                    // Patient Data
                    JsonNode labelInfo = results.get(0);
                    dto.setIndicationsAndUsage(getFirstArrayElement(labelInfo, "indications_and_usage", "Take as directed by your physician."));
                    dto.setDosageAndAdministration(getFirstArrayElement(labelInfo, "dosage_and_administration", "Follow the exact timing and instructions provided by your doctor."));
                    dto.setWarnings(getFirstArrayElement(labelInfo, "warnings", "Consult your doctor if you experience severe symptoms."));
                    dto.setAdverseReactions(getFirstArrayElement(labelInfo, "adverse_reactions", "May cause slight dizziness or nausea."));
                    dto.setPatientMedicationInformation(getFirstArrayElement(labelInfo, "information_for_patients", "If you miss a dose, take it as soon as you remember. Do not double up."));

                    // Extract logic for visual flags (e.g., alcohol warning)
                    List<String> flags = new ArrayList<>();
                    String warningsUpper = dto.getWarnings().toUpperCase();
                    if (warningsUpper.contains("ALCOHOL")) {
                        flags.add("NO ALCOHOL");
                    }
                    if (warningsUpper.contains("PREGNAN")) {
                        flags.add("PREGNANCY WARNING");
                    }
                    if (flags.isEmpty()) flags.add("STANDARD SAFETY");
                    dto.setContraindicationFlags(flags);
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch full drug details from FDA API for: {}", medicineName, e);
            // Provide sensible defaults if the API falls back
            dto.setIndicationsAndUsage("Data unavailable temporarily.");
            List<String> defaultFlags = new ArrayList<>();
            defaultFlags.add("VERIFY WITH PHARMACIST");
            dto.setContraindicationFlags(defaultFlags);
        }

        return dto;
    }

    private String getFirstArrayElement(JsonNode parent, String fieldName, String defaultValue) {
        JsonNode node = parent.path(fieldName);
        if (node.isArray() && node.size() > 0) {
            return node.get(0).asText();
        }
        return defaultValue;
    }
}
