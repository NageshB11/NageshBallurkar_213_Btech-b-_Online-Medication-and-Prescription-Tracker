package com.medical.backend.service;

import com.medical.backend.dto.DoctorAnalyticsSummaryDTO;
import com.medical.backend.dto.DoctorAnalyticsSummaryDTO.MonthlyMatrixPoint;
import com.medical.backend.dto.DoctorAnalyticsSummaryDTO.RiskPatientDTO;
import com.medical.backend.entity.User;
import com.medical.backend.entity.Prescription;
import com.medical.backend.repository.PrescriptionRepository;
import com.medical.backend.repository.UserRepository;
import com.medical.backend.dto.AdherenceDataPoint;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ClinicalAnalyticsService {

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @Autowired
    private AdherenceAnalyticsService adherenceAnalyticsService;

    @Autowired
    private UserRepository userRepository;

    public DoctorAnalyticsSummaryDTO getDoctorAnalyticsSummary(Long doctorId) {
        if (!userRepository.existsById(doctorId)) {
            throw new RuntimeException("Doctor not found");
        }

        List<User> doctorPatients = prescriptionRepository.findDistinctPatientsByDoctorId(doctorId).stream()
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
            
        int totalPatients = doctorPatients.size();

        // 1. Generate Monthly Matrix (Last 6 Months)
        List<MonthlyMatrixPoint> matrix = new ArrayList<>();
        YearMonth currentMonth = YearMonth.now();

        // Fetch all prescriptions once to save DB calls
        List<Prescription> allDoctorRx = prescriptionRepository.findByDoctor_Id(doctorId);

        double totalSuccessSum = 0;
        int activeMonthsCount = 0;

        for (int i = 5; i >= 0; i--) {
            YearMonth targetMonth = currentMonth.minusMonths(i);
            String monthLabel = targetMonth.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + targetMonth.getYear();

            // Count Rx issued this month
            long countIssued = allDoctorRx.stream()
                .filter(rx -> rx.getCreatedAt() != null && YearMonth.from(rx.getCreatedAt()).equals(targetMonth))
                .count();

            // Calculate Avg Adherence for all patients in this month
            double monthAdherenceSum = 0;
            int patientsWithData = 0;

            for (User p : doctorPatients) {
                try {
                    List<AdherenceDataPoint> trend = adherenceAnalyticsService.getAdherenceTrend(p.getId(), targetMonth.getMonthValue(), targetMonth.getYear());
                    if (!trend.isEmpty()) {
                        double patientMonthAvg = trend.stream()
                            .mapToDouble(dp -> dp.getPercentage() == null ? 0.0 : dp.getPercentage())
                            .average()
                            .orElse(0.0);
                        monthAdherenceSum += patientMonthAvg;
                        patientsWithData++;
                    }
                } catch (Exception e) {
                    System.err.println("Skipping patient ID " + (p != null ? p.getId() : "null") + " due to error: " + e.getMessage());
                }
            }

            double avgAdherence = (patientsWithData > 0) ? (monthAdherenceSum / patientsWithData) : 0.0;
            
            // Round to 1 decimal place
            avgAdherence = Math.round(avgAdherence * 10.0) / 10.0;

            matrix.add(new MonthlyMatrixPoint(monthLabel, (int) countIssued, avgAdherence));

            if (avgAdherence > 0) {
                totalSuccessSum += avgAdherence;
                activeMonthsCount++;
            }
        }

        double kpiSuccessRate = (activeMonthsCount > 0) ? Math.round((totalSuccessSum / activeMonthsCount) * 10.0) / 10.0 : 0.0;

        // 2. Generate Critical Risks List (Based on Current Month Adherence < 50%)
        List<RiskPatientDTO> riskList = new ArrayList<>();

        for (User p : doctorPatients) {
            try {
                List<AdherenceDataPoint> recentTrend = adherenceAnalyticsService.getAdherenceTrend(p.getId(), currentMonth.getMonthValue(), currentMonth.getYear());
                if (!recentTrend.isEmpty()) {
                    double avg = recentTrend.stream()
                        .mapToDouble(dp -> dp.getPercentage() == null ? 0.0 : dp.getPercentage())
                        .average()
                        .orElse(0.0);
                    
                    avg = Math.round(avg * 10.0) / 10.0;

                    String status = "GREEN";
                    if (avg < 50.0) {
                        status = "RED";
                    } else if (avg <= 75.0) {
                        status = "AMBER";
                    }

                    // If they are a risk (Red or Amber), add them to the list to allow the doctor to triage
                    if (!status.equals("GREEN")) {
                        riskList.add(new RiskPatientDTO(p.getId(), p.getFullName(), p.getEmail(), avg, status));
                    }
                }
            } catch (Exception e) {
                System.err.println("Skipping patient ID " + (p != null ? p.getId() : "null") + " in risk list due to error: " + e.getMessage());
            }
        }

        // Sort risks by lowest adherence first, limit to top 5
        riskList.sort(Comparator.comparingDouble(RiskPatientDTO::getAdherenceScore));
        List<RiskPatientDTO> topRisks = riskList.stream().limit(5).collect(Collectors.toList());

        return new DoctorAnalyticsSummaryDTO(matrix, topRisks, totalPatients, kpiSuccessRate);
    }
}
