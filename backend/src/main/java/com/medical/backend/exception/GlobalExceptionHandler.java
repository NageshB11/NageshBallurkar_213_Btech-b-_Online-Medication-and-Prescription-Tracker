package com.medical.backend.exception;

import com.medical.backend.dto.SafetyReportDTO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ClinicalSafetyException.class)
    public ResponseEntity<SafetyReportDTO> handleClinicalSafety(ClinicalSafetyException ex) {
        return new ResponseEntity<>(ex.getSafetyReport(), HttpStatus.CONFLICT);
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, String>> handleSecurity(SecurityException ex) {
        Map<String, String> body = new HashMap<>();
        body.put("error", "Security/Safety Conflict");
        body.put("message", ex.getMessage());
        return new ResponseEntity<>(body, HttpStatus.FORBIDDEN);
    }
}
