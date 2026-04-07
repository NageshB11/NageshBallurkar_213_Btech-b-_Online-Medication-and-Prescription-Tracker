package com.medical.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpiryInsightDTO {
    private int within30Days;
    private int within60Days;
    private int within90Days;
    private int totalExpired;
}
