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
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new RuntimeException("Email already in use");
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
