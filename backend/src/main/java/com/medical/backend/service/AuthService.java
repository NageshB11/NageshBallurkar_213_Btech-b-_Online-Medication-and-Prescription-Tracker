package com.medical.backend.service;

import com.medical.backend.entity.User;
import com.medical.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private NotificationService notificationService;

    public User registerUser(User user) {
        System.out.println("DEBUG: Registering user: " + user.getEmail());
        if (user.getEmail() == null || user.getEmail().isEmpty()) {
            throw new RuntimeException("Email is required");
        }
        if (user.getPassword() == null || user.getPassword().isEmpty()) {
            throw new RuntimeException("Password is required and cannot be null");
        }
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new RuntimeException("Email already in use");
        }

        // Professional License Validation
        if (user.getRole() == com.medical.backend.entity.Role.DOCTOR) {
            if (user.getMedicalLicenseNumber() == null || !user.getMedicalLicenseNumber().matches("^MED-\\d{6}$")) {
                throw new RuntimeException("Invalid Medical License format. Expected: MED-123456");
            }
        } else if (user.getRole() == com.medical.backend.entity.Role.PHARMACIST) {
            if (user.getPharmacyLicenseNumber() == null || !user.getPharmacyLicenseNumber().matches("^PHARM-\\d{6}$")) {
                throw new RuntimeException("Invalid Pharmacy License format. Expected: PHARM-123456");
            }
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));

        // Patients are automatically verified
        if (user.getRole() == com.medical.backend.entity.Role.PATIENT) {
            user.setVerified(true);
        } else {
            user.setVerified(false);
        }

        User savedUser = userRepository.save(user);

        // Notify admins about new professional registrations
        if (savedUser.getRole() == com.medical.backend.entity.Role.DOCTOR ||
                savedUser.getRole() == com.medical.backend.entity.Role.PHARMACIST) {

            List<User> admins = userRepository.findByRole(com.medical.backend.entity.Role.ADMIN);
            for (User admin : admins) {
                notificationService.createNotification(
                        admin,
                        "NEW REGISTRATION: A new " + savedUser.getRole() + " (" + savedUser.getFullName()
                                + ") has registered and requires verification.",
                        "ACCOUNT_VERIFICATION_REQUIRED");
            }
        }

        return savedUser;
    }
}
