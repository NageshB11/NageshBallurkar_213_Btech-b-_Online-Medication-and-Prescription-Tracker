package com.medical.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdherenceDataPoint {
    private String date; // Format: "yyyy-MM-dd"
    private Double percentage; // Can be null if skipped
}
