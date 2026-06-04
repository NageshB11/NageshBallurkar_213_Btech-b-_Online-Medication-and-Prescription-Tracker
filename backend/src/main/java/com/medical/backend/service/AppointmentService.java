package com.medical.backend.service;

import com.medical.backend.entity.Appointment;
import com.medical.backend.entity.User;
import com.medical.backend.repository.AppointmentRepository;
import com.medical.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class AppointmentService {

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationService notificationService;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd hh:mm a");

    public Appointment requestAppointment(Long patientId, Long doctorId, LocalDateTime date, String notes) {
        if (date == null || date.isBefore(LocalDateTime.now().minusMinutes(5))) {
            throw new IllegalArgumentException("Cannot request an appointment in the past.");
        }

        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient not found"));
        User doctor = userRepository.findById(doctorId)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));

        Appointment appointment = new Appointment();
        appointment.setPatient(patient);
        appointment.setDoctor(doctor);
        appointment.setAppointmentDate(date);
        appointment.setNotes(notes);
        appointment.setStatus(Appointment.AppointmentStatus.REQUESTED);

        return appointmentRepository.save(appointment);
    }

    public Appointment approveAppointment(Long appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        appointment.setStatus(Appointment.AppointmentStatus.APPROVED);
        Appointment saved = appointmentRepository.save(appointment);

        // Send notification to patient
        String formattedDate = appointment.getAppointmentDate().format(DATE_FORMATTER);
        String message = String.format("Your appointment with Dr. %s scheduled for %s has been approved.",
                appointment.getDoctor().getFullName(), formattedDate);
        notificationService.createNotification(appointment.getPatient(), message, "APPOINTMENT_APPROVED");

        return saved;
    }

    public Appointment rejectAppointment(Long appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        appointment.setStatus(Appointment.AppointmentStatus.REJECTED);
        Appointment saved = appointmentRepository.save(appointment);

        // Send notification to patient
        String formattedDate = appointment.getAppointmentDate().format(DATE_FORMATTER);
        String message = String.format("Your appointment request with Dr. %s scheduled for %s has been rejected.",
                appointment.getDoctor().getFullName(), formattedDate);
        notificationService.createNotification(appointment.getPatient(), message, "APPOINTMENT_REJECTED");

        return saved;
    }

    public Appointment rescheduleAppointment(Long appointmentId, LocalDateTime newDate, String reason) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found"));

        if (newDate == null || newDate.isBefore(LocalDateTime.now().minusMinutes(5))) {
            throw new IllegalArgumentException("Cannot reschedule to a time in the past.");
        }

        appointment.setAppointmentDate(newDate);
        if (reason != null && !reason.trim().isEmpty()) {
            appointment.setNotes(reason);
        }
        appointment.setStatus(Appointment.AppointmentStatus.APPROVED);

        Appointment saved = appointmentRepository.save(appointment);

        // Send notification to patient
        String formattedDate = newDate.format(DATE_FORMATTER);
        String message = String.format("Your appointment with Dr. %s has been rescheduled to %s. Reason: %s",
                appointment.getDoctor().getFullName(), formattedDate,
                (reason != null && !reason.trim().isEmpty()) ? reason : "Schedule conflict resolved");
        notificationService.createNotification(appointment.getPatient(), message, "APPOINTMENT_RESCHEDULED");

        return saved;
    }

    public List<Appointment> getAppointmentsByDoctor(Long doctorId) {
        return appointmentRepository.findByDoctorId(doctorId);
    }

    public List<Appointment> getAppointmentsByPatient(Long patientId) {
        return appointmentRepository.findByPatientId(patientId);
    }
}

