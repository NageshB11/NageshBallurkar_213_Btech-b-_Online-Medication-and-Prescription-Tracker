package com.medical.backend.service;

import com.medical.backend.dto.PatientRiskDTO;
import com.medical.backend.entity.AdherenceLog;
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

        List<PatientRiskDTO> riskList = new ArrayList<>();

        for (User patient : patients) {
            if ("PATIENT".equals(patient.getRole().name())) {
                PatientRiskDTO risk = calculatePatientRisk(patient);
                riskList.add(risk);
            }
        }

        // Sort: High risk first (Low adherence score)
        riskList.sort((a, b) -> Integer.compare(a.getAdherenceScore(), b.getAdherenceScore()));
        return riskList;
    }

    public PatientRiskDTO calculatePatientRisk(User patient) {
        List<Prescription> prescriptions = prescriptionRepository.findByPatientId(patient.getId());

        long totalExpectedDoses = 0;
        long totalTakenDoses = 0;

        for (Prescription p : prescriptions) {
            if (p.getStatus() != Prescription.PrescriptionStatus.ISSUED)
                continue;

            List<AdherenceLog> logs = adherenceLogRepository.findByPrescriptionId(p.getId());
            totalTakenDoses += logs.size();

            if (p.getItems() != null && !p.getItems().isEmpty()) {
                PrescriptionItem item = p.getItems().get(0);
                if (item.getStartDate() != null) {
                    LocalDate start = item.getStartDate();
                    LocalDate end = item.getEndDate() != null ? item.getEndDate() : LocalDate.now();
                    if (end.isAfter(LocalDate.now()))
                        end = LocalDate.now();

                    if (!start.isAfter(end)) {
                        long days = ChronoUnit.DAYS.between(start, end) + 1;
                        totalExpectedDoses += days;
                    }
                }
            }
        }

        int score = 100;
        if (totalExpectedDoses > 0) {
            score = (int) ((double) totalTakenDoses / totalExpectedDoses * 100);
            if (score > 100)
                score = 100;
        } else if (!prescriptions.isEmpty()) {
            // Default to 0 if they have meds but no expected doses calculated (e.g. data
            // issue)
            // or maybe 100 if just started? Let's say 100 to be safe.
            score = 100;
        }

        int missed = (int) (totalExpectedDoses - totalTakenDoses);
        if (missed < 0)
            missed = 0;
        PatientRiskDTO dto = new PatientRiskDTO(patient, score, missed);
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
