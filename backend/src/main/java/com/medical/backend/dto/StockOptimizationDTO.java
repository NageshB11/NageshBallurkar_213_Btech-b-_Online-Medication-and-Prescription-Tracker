package com.medical.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockOptimizationDTO {
    private String productName;
    private Integer currentStock;
    private Long totalUnitsSold;
    private Double reorderPoint;
    private String status; // CRITICAL, OPTIMIZED, OVERSTOCK
}
