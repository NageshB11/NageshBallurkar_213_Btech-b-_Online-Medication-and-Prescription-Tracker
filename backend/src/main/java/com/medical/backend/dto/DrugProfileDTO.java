package com.medical.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DrugProfileDTO {
    @JsonProperty("brandName")
    private String brandName;
    
    @JsonProperty("genericName")
    private String genericName;
    
    @JsonProperty("manufacturer")
    private String manufacturer;
    
    @JsonProperty("usageInstructions")
    private List<String> usageInstructions;
    
    @JsonProperty("contraindications")
    private List<String> contraindications;
    
    @JsonProperty("pregnancyWarning")
    private Boolean pregnancyWarning;
    
    @JsonProperty("alcoholWarning")
    private Boolean alcoholWarning;
    
    @JsonProperty("countryOfOrigin")
    private String countryOfOrigin;
    
    @JsonProperty("missedDoseTip")
    private String missedDoseTip;
    
    @JsonProperty("drugInteractions")
    private List<String> drugInteractions;
    
    @JsonProperty("foodInteractions")
    private List<String> foodInteractions;
    
    @JsonProperty("rxcui")
    private String rxcui;
    
    @JsonProperty("purpose")
    private String purpose;
    
    @JsonProperty("storageAdvice")
    private String storageAdvice;
    
    @JsonProperty("missedDoseAdvice")
    private String missedDoseAdvice;
    
    // Comprehensive Clinical Enhancement
    @JsonProperty("activeIngredients")
    private List<String> activeIngredients;
    
    @JsonProperty("pharmacologicalCategory")
    private String pharmacologicalCategory;
    
    @JsonProperty("pillImageUrl")
    private String pillImageUrl;
    
    @JsonProperty("healthConditionContraindications")
    private List<String> healthConditionContraindications;
    
    @JsonProperty("batchNumber")
    private String batchNumber;
    
    @JsonProperty("expiryDate")
    private String expiryDate;
}
