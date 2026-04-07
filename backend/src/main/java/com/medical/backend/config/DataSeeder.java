package com.medical.backend.config;

import com.medical.backend.entity.*;
import com.medical.backend.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

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
            System.out.println("Starting DataSeeder... 🚀");

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

            System.out.println("DEBUG: Seeding console.patient@gmail.com...");
            User testPatient = repository.findByEmail("console.patient@gmail.com").orElseGet(() -> {
                System.out.println("DEBUG: Creating NEW user console.patient@gmail.com");
                User p = new User();
                p.setEmail("console.patient@gmail.com");
                p.setRole(Role.PATIENT);
                p.setFullName("Test Patient");
                p.setMedicalHistory("Standard test patient for UI validation.");
                p.setVerified(true);
                return p;
            });
            String encodedPwd = passwordEncoder.encode("password");
            testPatient.setPassword(encodedPwd);
            repository.save(testPatient);
            System.out.println("DEBUG: User " + testPatient.getEmail() + " updated with hash: " + encodedPwd);

            System.out.println("DEBUG: Seeding console,patient@gmail.com (literal)...");
            User testPatientComma = repository.findByEmail("console,patient@gmail.com").orElseGet(() -> {
                System.out.println("DEBUG: Creating NEW user console,patient@gmail.com");
                User p = new User();
                p.setEmail("console,patient@gmail.com");
                p.setRole(Role.PATIENT);
                p.setFullName("Test Patient (Comma)");
                p.setMedicalHistory("Literal comma test patient.");
                p.setVerified(true);
                return p;
            });
            String encodedPwdComma = passwordEncoder.encode("password");
            testPatientComma.setPassword(encodedPwdComma);
            repository.save(testPatientComma);
            System.out.println("DEBUG: User " + testPatientComma.getEmail() + " updated with hash: " + encodedPwdComma);

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
        };
    }
}
