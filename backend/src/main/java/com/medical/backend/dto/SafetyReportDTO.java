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
public class SafetyReportDTO {
    private boolean isSafe;
    private List<String> allergyConflicts;
    private List<String> conditionConflicts;
    private List<String> severeInteractions;
    private List<String> moderateInteractions;
    private List<String> minorInteractions;
    private String summary;
}
