package com.medical.backend.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medical.backend.config.BeanUtil;
import com.medical.backend.entity.Prescription;
import com.medical.backend.entity.PrescriptionAudit;
import com.medical.backend.repository.PrescriptionAuditRepository;
import jakarta.persistence.PostPersist;
import jakarta.persistence.PostUpdate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.temporal.ChronoUnit;
import java.util.*;

public class PrescriptionEntityListener {

    @PostPersist
    @PostUpdate
    public void audit(Prescription prescription) {
        try {
            PrescriptionAuditRepository repository = BeanUtil.getBean(PrescriptionAuditRepository.class);
            ObjectMapper objectMapper = BeanUtil.getBean(ObjectMapper.class);

            // ── 1. Determine the action type ──────────────────────────────────────
            String actionType = prescription.getStatus() != null
                    ? prescription.getStatus().name()
                    : "UNKNOWN";

            // Skip non-meaningful lifecycle events (draft saves, internal reloads)
            if (prescription.getStatus() == Prescription.PrescriptionStatus.PENDING
                    || prescription.getStatus() == Prescription.PrescriptionStatus.APPROVED) {
                return;
            }

            // ── 2. Compute semantic version label (v1.0, v1.1 …) ─────────────────
            long existingCount = repository.countByPrescriptionId(prescription.getId());
            // existingCount is BEFORE this record is added; 0 → v1.0, 1 → v1.1, etc.
            String versionLabel = "v1." + existingCount;

            // ── 3. Resolve identity ───────────────────────────────────────────────
            String currentUser = "System";
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                currentUser = auth.getName();
            }

            // ── 4. Extract clinical data from first prescription item ─────────────
            String medicineName = "N/A";
            String dosage = "N/A";
            String duration = "N/A";

            if (prescription.getItems() != null && !prescription.getItems().isEmpty()) {
                com.medical.backend.entity.PrescriptionItem firstItem = prescription.getItems().get(0);
                if (firstItem.getMedicineName() != null)
                    medicineName = firstItem.getMedicineName();
                if (firstItem.getDosage() != null)
                    dosage = firstItem.getDosage();

                // Compute duration from start/end date
                if (firstItem.getStartDate() != null && firstItem.getEndDate() != null) {
                    long days = ChronoUnit.DAYS.between(firstItem.getStartDate(), firstItem.getEndDate()) + 1;
                    duration = days + " Day" + (days != 1 ? "s" : "");
                }
            }

            // ── 5. Build JSON snapshot ────────────────────────────────────────────
            Map<String, Object> snapshot = new LinkedHashMap<>();
            snapshot.put("id", prescription.getId());
            snapshot.put("status", actionType);
            snapshot.put("auditVersion", versionLabel);
            snapshot.put("doctor",
                    prescription.getDoctor() != null ? prescription.getDoctor().getFullName() : "System");
            snapshot.put("doctorId", prescription.getDoctor() != null ? prescription.getDoctor().getId() : null);
            snapshot.put("patient",
                    prescription.getPatient() != null ? prescription.getPatient().getFullName() : "N/A");
            snapshot.put("pharmacist",
                    prescription.getPharmacist() != null ? prescription.getPharmacist().getFullName() : "Pending");
            snapshot.put("pharmacistId",
                    prescription.getPharmacist() != null ? prescription.getPharmacist().getId() : null);
            snapshot.put("digitalSignature", prescription.getDigitalSignature());
            snapshot.put("filePath", prescription.getFilePath());
            snapshot.put("medicine", medicineName);
            snapshot.put("dosage", dosage);
            snapshot.put("duration", duration);

            List<Map<String, Object>> itemSnapshots = new ArrayList<>();
            if (prescription.getItems() != null) {
                for (com.medical.backend.entity.PrescriptionItem item : prescription.getItems()) {
                    Map<String, Object> i = new LinkedHashMap<>();
                    i.put("name", item.getMedicineName());
                    i.put("dosage", item.getDosage());
                    i.put("qty", item.getQuantity());
                    i.put("startDate", item.getStartDate() != null ? item.getStartDate().toString() : null);
                    i.put("endDate", item.getEndDate() != null ? item.getEndDate().toString() : null);
                    itemSnapshots.add(i);
                }
            }
            snapshot.put("items", itemSnapshots);

            // ── 6. Build and save the audit record ───────────────────────────────
            PrescriptionAudit audit = new PrescriptionAudit();
            audit.setPrescriptionId(prescription.getId());
            audit.setVersionLabel(versionLabel);
            audit.setActionType(actionType);
            audit.setModifiedBy(currentUser);
            audit.setChangeReason("Auto-audit: " + actionType);

            // Prescribed-by
            if (prescription.getDoctor() != null) {
                audit.setPrescribedById(prescription.getDoctor().getId());
                audit.setPrescribedByName(prescription.getDoctor().getFullName());
            }

            // Dispensed-by (only when actually dispensed)
            if (prescription.getStatus() == Prescription.PrescriptionStatus.DISPENSED
                    && prescription.getPharmacist() != null) {
                audit.setDispensedById(prescription.getPharmacist().getId());
                audit.setDispensedByName(prescription.getPharmacist().getFullName());
            }

            audit.setMedicineName(medicineName);
            audit.setDosage(dosage);
            audit.setDuration(duration);
            audit.setSnapshotJson(objectMapper.writeValueAsString(snapshot));

            // Keep legacy auditData field populated for backward compat
            audit.setAuditData(objectMapper.writeValueAsString(snapshot));

            repository.save(audit);

        } catch (Exception e) {
            System.err.println("CRITICAL: Audit logging failed for prescription " +
                    prescription.getId() + ": " + e.getMessage());
            e.printStackTrace();
        }
    }
}
