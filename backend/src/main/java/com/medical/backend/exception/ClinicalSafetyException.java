package com.medical.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
@lombok.Getter
public class ClinicalSafetyException extends RuntimeException {
    private final com.medical.backend.dto.SafetyReportDTO safetyReport;

    public ClinicalSafetyException(String message, com.medical.backend.dto.SafetyReportDTO safetyReport) {
        super(message);
        this.safetyReport = safetyReport;
    }
}
