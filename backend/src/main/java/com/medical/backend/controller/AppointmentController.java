package com.medical.backend.controller;

import com.medical.backend.entity.Appointment;
import com.medical.backend.entity.User;
import com.medical.backend.service.AppointmentService;
import com.medical.backend.config.JwtUtil;
import com.medical.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/appointments")
@CrossOrigin(origins = "*")
public class AppointmentController {

    @Autowired
    private AppointmentService appointmentService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/request")
    public ResponseEntity<Appointment> requestAppointment(@RequestHeader("Authorization") String token,
            @RequestBody Map<String, Object> request) {
        String email = jwtUtil.extractUsername(token.substring(7));
        User patient = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        Long patientId = patient.getId();

        Long doctorId = Long.valueOf(request.get("doctorId").toString());
        String dateStr = request.get("appointmentDate").toString();
        LocalDateTime date = LocalDateTime.parse(dateStr);
        String notes = (String) request.get("notes");

        return ResponseEntity.ok(appointmentService.requestAppointment(patientId, doctorId, date, notes));
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<Appointment> approveAppointment(@PathVariable("id") Long id) {
        return ResponseEntity.ok(appointmentService.approveAppointment(id));
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<Appointment> rejectAppointment(@PathVariable("id") Long id) {
        return ResponseEntity.ok(appointmentService.rejectAppointment(id));
    }

    @GetMapping("/doctor/me")
    public ResponseEntity<List<Appointment>> getDoctorAppointments(@RequestHeader("Authorization") String token) {
        String email = jwtUtil.extractUsername(token.substring(7));
        User doctor = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Doctor not found"));
        return ResponseEntity.ok(appointmentService.getAppointmentsByDoctor(doctor.getId()));
    }

    @GetMapping("/patient/my-appointments")
    public ResponseEntity<List<Appointment>> getPatientAppointments(@RequestHeader("Authorization") String token) {
        String email = jwtUtil.extractUsername(token.substring(7));
        User patient = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Patient not found"));
        return ResponseEntity.ok(appointmentService.getAppointmentsByPatient(patient.getId()));
    }
}
