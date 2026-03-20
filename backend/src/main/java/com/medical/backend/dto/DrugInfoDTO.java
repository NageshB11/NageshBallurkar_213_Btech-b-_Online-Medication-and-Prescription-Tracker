package com.medical.backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class DrugInfoDTO {
    // Unique identifier
    private String rxcui;
    
    // Core Identity
    private String brandName;
    private String genericName;
    private String activeIngredient;
    
    // Pharmacist Technical Data
    private String manufacturerName;
    private String productType; // Human Prescription Drug
    private String routeOfAdministration;
    
    // Patient Usage & Safety
    private String indicationsAndUsage; // Purpose
    private String dosageAndAdministration; // How to take it
    private String warnings; // Contraindications
    private String adverseReactions; // Side Effects
    private String patientMedicationInformation; // FAQ, what if I miss a dose?
    
    // Visual Flags
    private List<String> contraindicationFlags; // e.g., ["No Alcohol", "Pregnancy Warning"]
    private boolean requiresAuthenticityBadge; // True if verified manufacturer
}
