package com.medical.backend.service;

import com.medical.backend.entity.Prescription;
import com.medical.backend.entity.User;
import com.medical.backend.entity.Prescription.PrescriptionStatus;
import com.medical.backend.repository.PrescriptionRepository;
import com.medical.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;

@Service
public class PharmacistService {

        @Autowired
        private PrescriptionRepository prescriptionRepository;

        @Autowired
        private UserRepository userRepository;

        @Autowired
        private NotificationService notificationService;

        @Autowired
        private MedicineService medicineService;

        @Autowired
        private PrescriptionService prescriptionService;

        public Prescription getPrescriptionForDispensing(Long id) {
                Prescription prescription = prescriptionRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Prescription not found"));

                if (prescription.getStatus() != PrescriptionStatus.ISSUED
                                && prescription.getStatus() != PrescriptionStatus.PROCEEDED_TO_PHARMACIST) {
                        throw new RuntimeException("Prescription is not ISSUED or PROCEEDED_TO_PHARMACIST.");
                }

                if (prescription.isDispensed()) {
                        throw new RuntimeException("Prescription has already been dispensed.");
                }

                return prescription;
        }

        @Transactional
        public Prescription acceptPrescription(Long id, String pharmacistEmail) {
                Prescription prescription = prescriptionRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Prescription not found"));

                if (prescription.getStatus() != PrescriptionStatus.ISSUED) {
                        throw new RuntimeException("Prescription must be ISSUED to be accepted.");
                }

                User pharmacist = userRepository.findByEmail(pharmacistEmail)
                                .orElseThrow(() -> new RuntimeException("Pharmacist not found"));

                // Update Inventory upon acceptance
                if (prescription.getItems() != null) {
                        for (com.medical.backend.entity.PrescriptionItem item : prescription.getItems()) {
                                medicineService.decrementStock(item.getMedicineName(), item.getQuantity());
                        }
                }

                prescription.setPharmacist(pharmacist);

                return prescriptionService.broadcastStatusChange(prescription,
                                PrescriptionStatus.PROCEEDED_TO_PHARMACIST, "Accepted by Pharmacist", pharmacistEmail);
        }

        @Transactional
        public Prescription dispensePrescription(Long id, String pharmacistEmail) {
                Prescription prescription = getPrescriptionForDispensing(id);

                if (prescription.getStatus() != PrescriptionStatus.PROCEEDED_TO_PHARMACIST) {
                        throw new RuntimeException(
                                        "Prescription must be Accepted (PROCEEDED_TO_PHARMACIST) before it can be dispensed.");
                }

                if (prescription.isDispensed()) {
                        throw new RuntimeException("Prescription is already dispensed.");
                }

                User pharmacist = userRepository.findByEmail(pharmacistEmail)
                                .orElseThrow(() -> new RuntimeException("Pharmacist not found"));

                prescription.setPharmacist(pharmacist);

                return prescriptionService.broadcastStatusChange(prescription, PrescriptionStatus.DISPENSED,
                                "Dispensed by Pharmacist", pharmacistEmail);
        }

        public void requestClarification(Long id, String pharmacistEmail, String reason) {
                Prescription prescription = prescriptionRepository.findById(id)
                                .orElseThrow(() -> new RuntimeException("Prescription not found"));

                User pharmacist = userRepository.findByEmail(pharmacistEmail)
                                .orElseThrow(() -> new RuntimeException("Pharmacist not found"));

                if (prescription.getDoctor() != null) {
                        notificationService.createNotification(
                                        prescription.getDoctor(),
                                        "Pharmacist " + pharmacist.getFullName()
                                                        + " requested clarification on Prescription #"
                                                        + prescription.getId() + ": " + reason,
                                        "CLARIFICATION_REQUESTED");
                }
        }

        public java.util.List<Prescription> getPrescriptionsForPatient(Long patientId) {
                return prescriptionRepository.findByPatient_Id(patientId).stream()
                                .filter(p -> p.getStatus() == PrescriptionStatus.ISSUED)
                                .collect(java.util.stream.Collectors.toList());
        }
}
