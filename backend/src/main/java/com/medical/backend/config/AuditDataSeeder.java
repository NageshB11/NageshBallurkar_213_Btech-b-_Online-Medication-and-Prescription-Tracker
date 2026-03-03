package com.medical.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medical.backend.entity.*;
import com.medical.backend.repository.*;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Seeds complete dummy PrescriptionAudit records.
 * Deletes any existing records where prescribed_by_name IS NULL (incomplete
 * legacy rows),
 * then inserts fresh fully-populated ISSUED / DISPENSED / RENEWED events.
 */
@Component
public class AuditDataSeeder {

    @Autowired
    private PrescriptionAuditRepository auditRepo;
    @Autowired
    private PrescriptionRepository prescriptionRepo;
    @Autowired
    private UserRepository userRepo;
    @Autowired
    private ObjectMapper objectMapper;

    // Clinical datasets: {medicine, dosage, duration}
    private static final String[][] MEDS = {
            { "Amoxicillin", "500mg", "7 Days" },
            { "Amoxicillin", "1000mg", "14 Days" },
            { "Metformin", "500mg", "30 Days" },
            { "Metformin", "850mg", "60 Days" },
            { "Ibuprofen", "400mg", "5 Days" },
            { "Paracetamol", "650mg", "3 Days" },
            { "Azithromycin", "250mg", "5 Days" },
            { "Azithromycin", "500mg", "7 Days" },
            { "Atorvastatin", "20mg", "90 Days" },
            { "Lisinopril", "10mg", "30 Days" },
            { "Cetirizine", "10mg", "7 Days" },
            { "Omeprazole", "20mg", "14 Days" },
            { "Amlodipine", "5mg", "30 Days" },
            { "Amlodipine", "10mg", "60 Days" },
            { "Doxycycline", "100mg", "10 Days" },
    };

    @PostConstruct
    @Transactional
    public void seed() {
        // ── Step 1: Delete all incomplete records (where prescribedByName is null) ──
        List<PrescriptionAudit> allAudits = auditRepo.findAll();
        List<PrescriptionAudit> incomplete = allAudits.stream()
                .filter(a -> a.getPrescribedByName() == null || a.getMedicineName() == null)
                .toList();

        if (!incomplete.isEmpty()) {
            auditRepo.deleteAll(incomplete);
            auditRepo.flush();
            System.out.println("[AuditSeeder] 🗑  Removed " + incomplete.size() + " incomplete audit records.");
        }

        // ── Step 2: Check again — if fully-populated records already exist, skip ──
        long remaining = auditRepo.count();
        if (remaining > 0) {
            System.out.println("[AuditSeeder] ✅ " + remaining + " complete audit records found — skipping seed.");
            return;
        }

        // ── Step 3: Load real users ────────────────────────────────────────────────
        List<User> doctors = userRepo.findByRole(Role.DOCTOR);
        List<User> pharmacists = userRepo.findByRole(Role.PHARMACIST);
        List<Prescription> prescriptions = prescriptionRepo.findAll();

        if (prescriptions.isEmpty()) {
            System.out.println("[AuditSeeder] ❌ No prescriptions found — nothing to seed.");
            return;
        }

        // Provide at least one doctor/pharmacist fallback with complete names
        User fallbackDoctor = !doctors.isEmpty() ? doctors.get(0) : null;
        User fallbackPharmacist = !pharmacists.isEmpty() ? pharmacists.get(0) : null;

        Random rng = new Random(42);
        int saved = 0;

        for (int pi = 0; pi < prescriptions.size(); pi++) {
            Prescription rx = prescriptions.get(pi);

            // ── Resolve real doctor from the prescription or fallback ──────────
            User doctor = (rx.getDoctor() != null) ? rx.getDoctor() : fallbackDoctor;
            if (doctor == null)
                continue; // no doctor at all — skip

            String doctorName = nvl(doctor.getFullName(), "Dr. System");
            Long doctorId = doctor.getId();
            String doctorEmail = nvl(doctor.getEmail(), "doctor@system.com");

            // ── Resolve pharmacist ─────────────────────────────────────────────
            User pharmacist = (rx.getPharmacist() != null) ? rx.getPharmacist() : fallbackPharmacist;
            String pharmaName = pharmacist != null ? nvl(pharmacist.getFullName(), "Pharma Team") : "Pharma Team";
            Long pharmaId = pharmacist != null ? pharmacist.getId()
                    : (fallbackPharmacist != null ? fallbackPharmacist.getId() : null);
            String pharmaEmail = pharmacist != null ? nvl(pharmacist.getEmail(), "pharma@system.com")
                    : "pharma@system.com";

            // ── Resolve patient name ───────────────────────────────────────────
            String patientName = (rx.getPatient() != null) ? nvl(rx.getPatient().getFullName(), "Patient") : "Patient";

            // ── Clinical data for this prescription ────────────────────────────
            String[] base = MEDS[pi % MEDS.length];
            String[] next = MEDS[(pi + 2) % MEDS.length]; // +2 to guarantee a different entry

            LocalDateTime baseTime = (rx.getCreatedAt() != null)
                    ? rx.getCreatedAt().plusMinutes(10)
                    : LocalDateTime.now().minusDays(pi + 2);

            // ─────────────────────────────────────────────────────────────────
            // EVENT 1 — v1.0 ISSUED
            // ─────────────────────────────────────────────────────────────────
            LocalDateTime issuedAt = baseTime;
            auditRepo.save(buildAudit(
                    rx.getId(), "v1.0", "ISSUED",
                    doctorId, doctorName, doctorEmail,
                    null, null, null,
                    base[0], base[1], base[2],
                    patientName, issuedAt,
                    "Initial prescription issued by " + doctorName));
            saved++;

            // ─────────────────────────────────────────────────────────────────
            // EVENT 2 — v1.0 DISPENSED (same version, pharmacist stamps)
            // ─────────────────────────────────────────────────────────────────
            LocalDateTime dispensedAt = issuedAt.plusHours(2 + rng.nextInt(10));
            auditRepo.save(buildAudit(
                    rx.getId(), "v1.0", "DISPENSED",
                    doctorId, doctorName, doctorEmail,
                    pharmaId, pharmaName, pharmaEmail,
                    base[0], base[1], base[2],
                    patientName, dispensedAt,
                    "Dispensed by " + pharmaName));
            saved++;

            // ─────────────────────────────────────────────────────────────────
            // EVENT 3 — v1.1 RENEWED (every other prescription for variety)
            // ─────────────────────────────────────────────────────────────────
            if (pi % 2 == 0) {
                // Prefer a second doctor if available, else same doctor
                User renewDoc = (doctors.size() > 1) ? doctors.get((pi + 1) % doctors.size()) : doctor;
                String renewName = nvl(renewDoc.getFullName(), doctorName);
                Long renewId = renewDoc.getId();
                String renewEmail = nvl(renewDoc.getEmail(), doctorEmail);

                LocalDateTime renewedAt = dispensedAt.plusDays(7 + rng.nextInt(8));
                auditRepo.save(buildAudit(
                        rx.getId(), "v1.1", "RENEWED",
                        renewId, renewName, renewEmail,
                        null, null, null,
                        next[0], next[1], next[2], // different clinical data → delta
                        patientName, renewedAt,
                        "Prescription renewed with adjusted dosage by " + renewName));
                saved++;
            }
        }

        System.out.println("[AuditSeeder] ✅ Seeded " + saved + " fully-populated audit records across "
                + prescriptions.size() + " prescriptions.");
    }

    // ── Builder ────────────────────────────────────────────────────────────────
    private PrescriptionAudit buildAudit(
            Long rxId, String versionLabel, String actionType,
            Long prescribedById, String prescribedByName, String prescribedByEmail,
            Long dispensedById, String dispensedByName, String dispensedByEmail,
            String medicine, String dosage, String duration,
            String patientName, LocalDateTime ts, String reason) {

        PrescriptionAudit a = new PrescriptionAudit();
        a.setPrescriptionId(rxId);
        a.setVersionLabel(versionLabel);
        a.setActionType(actionType);

        a.setPrescribedById(prescribedById);
        a.setPrescribedByName(prescribedByName);

        // Dispensed-by: always use provided values (pharmaName guaranteed non-null for
        // DISPENSED)
        a.setDispensedById(dispensedById);
        a.setDispensedByName(
                dispensedByName != null ? dispensedByName : (actionType.equals("DISPENSED") ? "Pharmacy Team" : null));

        a.setMedicineName(medicine);
        a.setDosage(dosage);
        a.setDuration(duration);
        a.setModifiedAt(ts);
        a.setModifiedBy(prescribedByEmail);
        a.setChangeReason(reason);

        // Build full JSON snapshot
        Map<String, Object> snap = new LinkedHashMap<>();
        snap.put("id", rxId);
        snap.put("status", actionType);
        snap.put("auditVersion", versionLabel);
        snap.put("doctor", prescribedByName);
        snap.put("pharmacist", dispensedByName != null ? dispensedByName : "Pending");
        snap.put("patient", patientName);
        Map<String, String> item = new LinkedHashMap<>();
        item.put("name", medicine);
        item.put("dosage", dosage);
        item.put("duration", duration);
        snap.put("items", List.of(item));
        try {
            String json = objectMapper.writeValueAsString(snap);
            a.setSnapshotJson(json);
            a.setAuditData(json); // keep legacy field in sync
        } catch (Exception ignored) {
        }

        return a;
    }

    private String nvl(String val, String fallback) {
        return (val != null && !val.isBlank()) ? val : fallback;
    }
}
