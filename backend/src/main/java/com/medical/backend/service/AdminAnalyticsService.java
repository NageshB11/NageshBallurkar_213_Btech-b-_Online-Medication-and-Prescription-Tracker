package com.medical.backend.service;

import com.medical.backend.entity.Role;
import com.medical.backend.repository.PrescriptionRepository;
import com.medical.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class AdminAnalyticsService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    public Map<String, Object> getPlatformCensus() {
        Map<String, Object> census = new HashMap<>();
        census.put("totalUsers", userRepository.count());
        census.put("patients", userRepository.countByRole(Role.PATIENT));
        census.put("doctors", userRepository.countByRole(Role.DOCTOR));
        census.put("pharmacists", userRepository.countByRole(Role.PHARMACIST));
        
        long totalRx = prescriptionRepository.count();
        census.put("totalPrescriptions", totalRx);
        
        // Additional global metrics
        census.put("timestamp", java.time.LocalDateTime.now());
        return census;
    }
}
