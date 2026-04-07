package com.medical.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PharmacyIntelligenceDTO {
    private List<StockOptimizationDTO> topSelling;
    private List<StockOptimizationDTO> stockOptimization;
    private ExpiryInsightDTO expiryInsights;
}
