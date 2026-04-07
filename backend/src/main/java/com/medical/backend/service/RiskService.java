package com.medical.backend.service;

import com.medical.backend.dto.PatientRiskDTO;
import com.medical.backend.entity.Prescription;
import com.medical.backend.entity.PrescriptionItem;
import com.medical.backend.entity.User;
import com.medical.backend.repository.AdherenceLogRepository;
import com.medical.backend.repository.PrescriptionRepository;
import com.medical.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
public class RiskService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @Autowired
    private AdherenceLogRepository adherenceLogRepository;

    public List<PatientRiskDTO> getPatientsByRisk(Long doctorId) {
        // Ideally filter by doctor, but for now getting all patients for demo
        List<User> patients = userRepository.findAll();
        System.out.println("RiskService: Total users found: " + patients.size());

        List<PatientRiskDTO> riskList = new ArrayList<>();

        for (User patient : patients) {
            if (patient.getRole() != null && "PATIENT".equals(patient.getRole().name())) {
                try {
                    PatientRiskDTO risk = calculatePatientRisk(patient);
                    riskList.add(risk);
                } catch (Exception e) {
                    System.err.println("Error calculating risk for patient " + patient.getId() + ": " + e.getMessage());
                }
            } else if (patient.getRole() == null) {
                System.err.println("Warning: User " + patient.getEmail() + " has NULL role");
            }
        }
        System.out.println("RiskService: Returning risk list of size: " + riskList.size());

        // Filter OUT patients with no therapeutic workload — they clutter the triage view
        riskList.removeIf(r -> !r.isHasWorkload());
        System.out.println("RiskService: After workload filter, size: " + riskList.size());

        // Sort: High risk first (Low adherence score)
        riskList.sort((a, b) -> Integer.compare(a.getAdherenceScore(), b.getAdherenceScore()));
        return riskList;
    }

    public PatientRiskDTO calculatePatientRisk(User patient) {
        List<Prescription> prescriptions = prescriptionRepository.findByPatientId(patient.getId());

        long totalExpectedDoses = 0;
        long totalTakenDoses = 0;

        // Total taken across all history for this patient (legacy + current)
        totalTakenDoses = adherenceLogRepository.findByPatientId(patient.getId()).size();

        for (Prescription p : prescriptions) {
            if (p.getStatus() != Prescription.PrescriptionStatus.ISSUED && 
                p.getStatus() != Prescription.PrescriptionStatus.DISPENSED &&
                p.getStatus() != Prescription.PrescriptionStatus.PROCEEDED_TO_PHARMACIST)
                continue;

            if (p.getItems() != null) {
                for (PrescriptionItem item : p.getItems()) {
                    if (item.getStartDate() != null) {
                        LocalDate start = item.getStartDate();
                        LocalDate end = item.getEndDate() != null ? item.getEndDate() : LocalDate.now();
                        if (end.isAfter(LocalDate.now()))
                            end = LocalDate.now();

                        if (!start.isAfter(end)) {
                            long days = ChronoUnit.DAYS.between(start, end) + 1;
                            
                            // Count meal slots for this specific item
                            int slotsPerDay = 1;
                            if (item.getMealSlots() != null && !item.getMealSlots().isEmpty()) {
                                slotsPerDay = item.getMealSlots().split(",").length;
                            }
                            
                            totalExpectedDoses += (days * slotsPerDay);
                        }
                    }
                }
            }
        }

        int score = 0; 
        boolean hasWorkload = false;

        if (totalExpectedDoses > 0) {
            hasWorkload = true;
            score = (int) ((double) totalTakenDoses / totalExpectedDoses * 100);
            if (score > 100)
                score = 100;
        } else {
            // No expected doses = No workload to measure adherence against.
            // We set score to 0 and hasWorkload to false so the UI can handle it.
            score = 0;
            hasWorkload = false;
        }

        int missed = (int) (totalExpectedDoses - totalTakenDoses);
        if (missed < 0)
            missed = 0;
        
        PatientRiskDTO dto = new PatientRiskDTO(patient, score, missed, prescriptions.size());
        dto.setHasWorkload(hasWorkload);
        // Find latest dispensed info
        prescriptions.stream()
                .filter(Prescription::isDispensed)
                .max(java.util.Comparator.comparing(Prescription::getDispensedAt))
                .ifPresent(p -> {
                    dto.setLastPharmacistName(p.getPharmacist() != null ? p.getPharmacist().getFullName() : "N/A");
                    dto.setLastDispensedAt(p.getDispensedAt());
                });
        return dto;
    }
}
