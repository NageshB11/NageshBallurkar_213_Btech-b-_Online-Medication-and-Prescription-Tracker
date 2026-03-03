package com.medical.backend.service;

import com.medical.backend.repository.PrescriptionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Service
public class AnomalyDetectionService {

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    private static final int THRESHOLD = 50; // Max prescriptions per 24h

    public boolean checkAnomaly(Long doctorId) {
        LocalDateTime twentyFourHoursAgo = LocalDateTime.now().minusHours(24);
        long count = prescriptionRepository.countByDoctor_IdAndCreatedAtAfter(doctorId, twentyFourHoursAgo);

        if (count > THRESHOLD) {
            return true;
        }
        return false;
    }
}
