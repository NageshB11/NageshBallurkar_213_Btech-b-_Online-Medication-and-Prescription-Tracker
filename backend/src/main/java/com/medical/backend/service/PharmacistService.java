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

        @Autowired
        private com.medical.backend.repository.PrescriptionItemRepository prescriptionItemRepository;

        @Autowired
        private PdfService pdfService;

        @Autowired
        private InventoryService inventoryService;

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
                                medicineService.decrementStock(item.getMedicineName(), item.calculateTotalQuantity());
                        }
                }

                prescription.setPharmacist(pharmacist);

                return prescriptionService.broadcastStatusChange(prescription,
                                PrescriptionStatus.PROCEEDED_TO_PHARMACIST, "Accepted by Pharmacist", pharmacistEmail);
        }

        @Transactional
        public Prescription dispensePrescription(Long id, String pharmacistEmail, Double cost) {
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
                
                // Automatic Cost Calculation if not provided
                if (cost == null || cost == 0) {
                        double autoCost = 0;
                        if (prescription.getItems() != null) {
                                for (com.medical.backend.entity.PrescriptionItem item : prescription.getItems()) {
                                        com.medical.backend.entity.Medicine med = medicineService.getMedicineByName(item.getMedicineName());
                                        if (med != null) {
                                                autoCost += (item.getQuantity() * med.getUnitPrice());
                                        }
                                }
                        }
                        prescription.setTotalCost(autoCost);
                } else {
                        prescription.setTotalCost(cost);
                }
                
                prescription.setCurrency("INR");

                // Decrement batch-wise inventory upon dispensing
                if (prescription.getItems() != null) {
                        for (com.medical.backend.entity.PrescriptionItem item : prescription.getItems()) {
                                if (item.getAvailable() == null || item.getAvailable()) {
                                        inventoryService.decrementStock(item.getMedicineName(), item.calculateTotalQuantity());
                                }
                        }
                }

                return prescriptionService.broadcastStatusChange(prescription, PrescriptionStatus.DISPENSED,
                                "Dispensed by Pharmacist - Total Cost: ₹" + prescription.getTotalCost(), pharmacistEmail);
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

        @Transactional
        public Prescription updateItemAvailability(Long itemId, boolean available, String pharmacistEmail) {
                com.medical.backend.entity.PrescriptionItem item = prescriptionItemRepository.findById(itemId)
                                .orElseThrow(() -> new RuntimeException("Prescription item not found"));

                Prescription prescription = item.getPrescription();
                if (prescription.getStatus() != PrescriptionStatus.ISSUED &&
                    prescription.getStatus() != PrescriptionStatus.PROCEEDED_TO_PHARMACIST) {
                        throw new RuntimeException("Cannot verify stock for a prescription that is not active.");
                }

                Boolean oldAvailable = item.getAvailable();
                item.setAvailable(available);
                prescriptionItemRepository.save(item);

                // Synchronize parent prescription's items collection to avoid Hibernate cache discrepancy
                if (prescription.getItems() != null) {
                        for (com.medical.backend.entity.PrescriptionItem pi : prescription.getItems()) {
                                if (pi.getId().equals(itemId)) {
                                        pi.setAvailable(available);
                                }
                        }
                }

                // Stock inventory corrections
                if (oldAvailable == null || oldAvailable) {
                        if (!available) {
                                // Changed to Not Available: restore stock
                                medicineService.incrementStock(item.getMedicineName(), item.calculateTotalQuantity());
                        }
                } else {
                        if (available) {
                                // Changed to Available: decrement stock
                                medicineService.decrementStock(item.getMedicineName(), item.calculateTotalQuantity());
                        }
                }

                // Check if all items in this prescription are verified
                boolean allVerified = true;
                if (prescription.getItems() != null) {
                        for (com.medical.backend.entity.PrescriptionItem pi : prescription.getItems()) {
                                if (pi.getAvailable() == null) {
                                        allVerified = false;
                                        break;
                                }
                        }
                }

                if (allVerified) {
                        double autoCost = 0;
                        if (prescription.getItems() != null) {
                                for (com.medical.backend.entity.PrescriptionItem pi : prescription.getItems()) {
                                        if (pi.getAvailable() != null && pi.getAvailable()) {
                                                com.medical.backend.entity.Medicine med = medicineService.getMedicineByName(pi.getMedicineName());
                                                if (med != null) {
                                                        autoCost += (pi.getQuantity() * med.getUnitPrice());
                                                }
                                        }
                                }
                        }
                        prescription.setTotalCost(autoCost);
                        prescription.setCurrency("INR");
                        prescriptionRepository.save(prescription);

                        // Generate PDF automatically
                        try {
                                String fileName = pdfService.generatePrescriptionPdf(prescription);
                                prescription.setFilePath(fileName);
                                prescriptionRepository.save(prescription);
                                System.out.println("[STOCK-VERIFY] All items verified. Calculated cost: ₹" + autoCost + ". Generated PDF for prescription #" + prescription.getId());
                        } catch (Exception e) {
                                System.err.println("[WARN] PDF generation failed on verification completion for #" + prescription.getId() + ": " + e.getMessage());
                        }
                }

                return prescriptionRepository.findById(prescription.getId()).orElse(prescription);
        }
}
