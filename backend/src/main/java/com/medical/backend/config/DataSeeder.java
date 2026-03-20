package com.medical.backend.config;

import com.medical.backend.entity.*;
import com.medical.backend.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner startDatabase(UserRepository repository,
            PrescriptionRepository prescriptionRepository,
            PrescriptionItemRepository itemRepository,
            AppointmentRepository appointmentRepository,
            NotificationRepository notificationRepository,
            AdherenceLogRepository adherenceLogRepository,
            PasswordEncoder passwordEncoder) {
        return args -> {

            // ═══ USERS ════════════════════════════════════════════════════
            User admin = repository.findByEmail("admin@medtrack.com").orElseGet(() -> {
                User a = new User();
                a.setEmail("admin@medtrack.com");
                a.setRole(Role.ADMIN);
                a.setFullName("System Admin");
                a.setVerified(true);
                return a;
            });
            admin.setPassword(passwordEncoder.encode("password"));
            repository.save(admin);

            User doctor = repository.findByEmail("doctor@example.com").orElseGet(() -> {
                User d = new User();
                d.setEmail("doctor@example.com");
                d.setPassword(passwordEncoder.encode("password"));
                d.setRole(Role.DOCTOR);
                d.setFullName("Dr. Alex Spreadsheet");
                d.setMedicalLicenseNumber("MD-12345");
                d.setSpecialization("General Physician");
                d.setVerified(true);
                return repository.save(d);
            });

            User doctor2 = repository.findByEmail("dr.sarah@example.com").orElseGet(() -> {
                User d = new User();
                d.setEmail("dr.sarah@example.com");
                d.setRole(Role.DOCTOR);
                d.setFullName("Dr. Sarah Mitchell");
                d.setMedicalLicenseNumber("MD-67890");
                d.setSpecialization("Cardiologist");
                d.setVerified(true);
                return d;
            });
            doctor2.setPassword(passwordEncoder.encode("password"));
            doctor2 = repository.save(doctor2);

            User pharmacist = repository.findByEmail("pharmacist@example.com").orElseGet(() -> {
                User ph = new User();
                ph.setEmail("pharmacist@example.com");
                ph.setRole(Role.PHARMACIST);
                ph.setFullName("James Pharma");
                ph.setVerified(true);
                return ph;
            });
            pharmacist.setPassword(passwordEncoder.encode("password"));
            pharmacist = repository.save(pharmacist);

            User leo = repository.findByEmail("console.leo@gmail.com").orElseGet(() -> {
                User p = new User();
                p.setEmail("console.leo@gmail.com");
                p.setPassword(passwordEncoder.encode("password"));
                p.setRole(Role.PATIENT);
                p.setFullName("Console Leo");
                p.setMedicalHistory("Regular health checkups. No known allergies.");
                p.setVerified(true);
                return repository.save(p);
            });

            // ═══ PRESCRIPTIONS ════════════════════════════════════════════
            if (prescriptionRepository.findByPatient_Id(leo.getId()).isEmpty()) {

                // Rx 1: ISSUED (Active)
                Prescription rx1 = new Prescription();
                rx1.setPatient(leo);
                rx1.setDoctor(doctor);
                rx1.setStatus(Prescription.PrescriptionStatus.ISSUED);
                rx1.setDigitalSignature("SIG_LEO_001");
                rx1.setCreatedAt(LocalDateTime.now().minusDays(3));
                rx1 = prescriptionRepository.save(rx1);

                PrescriptionItem item1 = new PrescriptionItem();
                item1.setPrescription(rx1);
                item1.setMedicineName("Amoxicillin");
                item1.setDosage("500mg");
                item1.setQuantity(20);
                item1.setDosageTiming("Morning,Night");
                item1.setStartDate(LocalDate.now().minusDays(3));
                item1.setEndDate(LocalDate.now().plusDays(7));
                itemRepository.save(item1);

                // Rx 2: PROCEEDED_TO_PHARMACIST
                Prescription rx2 = new Prescription();
                rx2.setPatient(leo);
                rx2.setDoctor(doctor);
                rx2.setStatus(Prescription.PrescriptionStatus.PROCEEDED_TO_PHARMACIST);
                rx2.setDigitalSignature("SIG_LEO_002");
                rx2.setCreatedAt(LocalDateTime.now().minusDays(5));
                rx2 = prescriptionRepository.save(rx2);

                PrescriptionItem item2 = new PrescriptionItem();
                item2.setPrescription(rx2);
                item2.setMedicineName("Lisinopril");
                item2.setDosage("10mg");
                item2.setQuantity(30);
                item2.setDosageTiming("Morning");
                item2.setStartDate(LocalDate.now().minusDays(5));
                item2.setEndDate(LocalDate.now().plusDays(25));
                itemRepository.save(item2);

                // Rx 3: DISPENSED
                Prescription rx3 = new Prescription();
                rx3.setPatient(leo);
                rx3.setDoctor(doctor2);
                rx3.setPharmacist(pharmacist);
                rx3.setStatus(Prescription.PrescriptionStatus.DISPENSED);
                rx3.setDigitalSignature("SIG_LEO_003");
                rx3.setDispensed(true);
                rx3.setDispensedAt(LocalDateTime.now().minusDays(2));
                rx3.setCreatedAt(LocalDateTime.now().minusDays(7));
                rx3 = prescriptionRepository.save(rx3);

                PrescriptionItem item3 = new PrescriptionItem();
                item3.setPrescription(rx3);
                item3.setMedicineName("Metformin");
                item3.setDosage("850mg");
                item3.setQuantity(60);
                item3.setDosageTiming("Morning,Evening");
                item3.setStartDate(LocalDate.now().minusDays(7));
                item3.setEndDate(LocalDate.now().plusDays(23));
                itemRepository.save(item3);

                // Rx 4: Another DISPENSED
                Prescription rx4 = new Prescription();
                rx4.setPatient(leo);
                rx4.setDoctor(doctor);
                rx4.setPharmacist(pharmacist);
                rx4.setStatus(Prescription.PrescriptionStatus.DISPENSED);
                rx4.setDigitalSignature("SIG_LEO_004");
                rx4.setDispensed(true);
                rx4.setDispensedAt(LocalDateTime.now().minusDays(1));
                rx4.setCreatedAt(LocalDateTime.now().minusDays(10));
                rx4 = prescriptionRepository.save(rx4);

                PrescriptionItem item4 = new PrescriptionItem();
                item4.setPrescription(rx4);
                item4.setMedicineName("Atorvastatin");
                item4.setDosage("20mg");
                item4.setQuantity(30);
                item4.setDosageTiming("Night");
                item4.setStartDate(LocalDate.now().minusDays(10));
                item4.setEndDate(LocalDate.now().plusDays(20));
                itemRepository.save(item4);

                // Adherence Logs
                for (int day = 0; day < 5; day++) {
                    AdherenceLog log1 = new AdherenceLog();
                    log1.setPatient(leo);
                    log1.setPrescription(rx1);
                    log1.setLogDate(LocalDateTime.now().minusDays(day).withHour(9).withMinute(0));
                    adherenceLogRepository.save(log1);
                }
                for (int day = 0; day < 7; day++) {
                    AdherenceLog log2 = new AdherenceLog();
                    log2.setPatient(leo);
                    log2.setPrescription(rx3);
                    log2.setLogDate(LocalDateTime.now().minusDays(day).withHour(8).withMinute(30));
                    adherenceLogRepository.save(log2);
                }
                for (int day = 0; day < 3; day++) {
                    AdherenceLog log3 = new AdherenceLog();
                    log3.setPatient(leo);
                    log3.setPrescription(rx4);
                    log3.setLogDate(LocalDateTime.now().minusDays(day).withHour(21).withMinute(0));
                    adherenceLogRepository.save(log3);
                }

                System.out.println("  Seeded 4 prescriptions + 15 adherence logs");
            }

            // ═══ APPOINTMENTS ═════════════════════════════════════════════
            if (appointmentRepository.findByPatientId(leo.getId()).isEmpty()) {
                Appointment appt1 = new Appointment();
                appt1.setPatient(leo);
                appt1.setDoctor(doctor);
                appt1.setAppointmentDate(LocalDateTime.now().plusDays(3).withHour(10).withMinute(30));
                appt1.setStatus(Appointment.AppointmentStatus.APPROVED);
                appt1.setNotes("Follow-up on antibiotic course");
                appointmentRepository.save(appt1);

                Appointment appt2 = new Appointment();
                appt2.setPatient(leo);
                appt2.setDoctor(doctor2);
                appt2.setAppointmentDate(LocalDateTime.now().plusDays(7).withHour(14).withMinute(0));
                appt2.setStatus(Appointment.AppointmentStatus.REQUESTED);
                appt2.setNotes("Heart rate irregularity check");
                appointmentRepository.save(appt2);

                Appointment appt3 = new Appointment();
                appt3.setPatient(leo);
                appt3.setDoctor(doctor);
                appt3.setAppointmentDate(LocalDateTime.now().minusDays(5).withHour(9).withMinute(0));
                appt3.setStatus(Appointment.AppointmentStatus.COMPLETED);
                appt3.setNotes("Initial consultation — prescribed Amoxicillin");
                appointmentRepository.save(appt3);

                System.out.println("  Seeded 3 appointments");
            }

            // ═══ NOTIFICATIONS ════════════════════════════════════════════
            if (notificationRepository.findByUser_IdOrderByCreatedAtDesc(leo.getId()).isEmpty()) {
                Notification n1 = new Notification();
                n1.setUser(leo);
                n1.setMessage("Your prescription for Amoxicillin has been issued by Dr. Alex Spreadsheet.");
                n1.setType("INFO");
                n1.setCreatedAt(LocalDateTime.now().minusDays(3));
                notificationRepository.save(n1);

                Notification n2 = new Notification();
                n2.setUser(leo);
                n2.setMessage("Metformin has been dispensed by James Pharma. Ready for pickup.");
                n2.setType("INFO");
                n2.setCreatedAt(LocalDateTime.now().minusDays(2));
                notificationRepository.save(n2);

                Notification n3 = new Notification();
                n3.setUser(leo);
                n3.setMessage("Reminder: Your appointment with Dr. Alex Spreadsheet is in 3 days.");
                n3.setType("REMINDER");
                n3.setCreatedAt(LocalDateTime.now().minusHours(6));
                notificationRepository.save(n3);

                Notification n4 = new Notification();
                n4.setUser(leo);
                n4.setMessage("Atorvastatin 20mg has been dispensed. Please follow dosage instructions.");
                n4.setType("INFO");
                n4.setCreatedAt(LocalDateTime.now().minusDays(1));
                notificationRepository.save(n4);

                Notification n5 = new Notification();
                n5.setUser(leo);
                n5.setMessage("Your blood pressure reading is slightly elevated. Please monitor.");
                n5.setType("WARNING");
                n5.setCreatedAt(LocalDateTime.now().minusHours(2));
                notificationRepository.save(n5);

                System.out.println("  Seeded 5 notifications");
            }

            System.out.println("═══════════════════════════════════════════════════════");
            System.out.println("  DATA SEEDING COMPLETE for console.leo@gmail.com");
            System.out.println("═══════════════════════════════════════════════════════");
        };
    }
}
