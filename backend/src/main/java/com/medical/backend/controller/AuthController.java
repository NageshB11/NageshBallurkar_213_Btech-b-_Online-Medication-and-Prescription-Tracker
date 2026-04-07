
package com.medical.backend.controller;

import com.medical.backend.service.AuthService;
import com.medical.backend.config.JwtUtil;
import com.medical.backend.entity.User;
import com.medical.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody User user) {
        try {
            System.out.println("DEBUG: Attempting registration for email: " + user.getEmail());
            User savedUser = authService.registerUser(user);
            System.out.println("DEBUG: Registration successful for: " + savedUser.getEmail());
            return ResponseEntity.ok(Map.of("message", "User registered successfully as " + savedUser.getRole()));
        } catch (Exception e) {
            System.err.println("ERROR during registration: " + e.getMessage());
            e.printStackTrace();
            String errorMessage = e.getMessage();
            if (errorMessage == null) {
                errorMessage = "Validation error or missing fields (Password/Role may be null)";
            }
            return ResponseEntity.badRequest().body(java.util.Collections.singletonMap("message", errorMessage));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody Map<String, String> loginRequest, jakarta.servlet.http.HttpServletRequest request) {
        String email = loginRequest.get("email") != null ? loginRequest.get("email").toLowerCase() : "";
        String password = loginRequest.get("password");

        System.out.println("DEBUG: Login attempt for email: [" + email + "]");

        return userRepository.findByEmail(email)
                .map(user -> {
                    if (!user.isActive()) {
                        System.out.println("DEBUG: Login rejected - Account Suspended");
                        return ResponseEntity.status(403).body(Map.of("message", "Account Suspended. Please contact administration."));
                    }
                    
                    String requestedRole = loginRequest.get("role");
                    if (requestedRole != null && !requestedRole.equalsIgnoreCase(user.getRole().name())) {
                        System.out.println("DEBUG: Login rejected - Role mismatch. Expected: " + user.getRole() + ", Got: " + requestedRole);
                        return ResponseEntity.status(401).body(Map.of("message", "Invalid role selected for this account. Please select the correct module."));
                    }

                    boolean matches = passwordEncoder.matches(password, user.getPassword());
                    System.out.println("DEBUG: User found! Role: " + user.getRole() + ", Hash in DB: [" + user.getPassword() + "]");
                    System.out.println("DEBUG: Password matches: " + matches);

                    if (matches) {
                        // Capture IP and Timestamp for User 360
                        String ipAddress = request.getHeader("X-FORWARDED-FOR");
                        if (ipAddress == null || "".equals(ipAddress)) {
                            ipAddress = request.getRemoteAddr();
                        }
                        user.setLastIpAddress(ipAddress);
                        user.setLastLogin(java.time.LocalDateTime.now());
                        userRepository.save(user);

                        String token = jwtUtil.generateToken(user.getEmail(), user.isVerified());
                        return ResponseEntity.ok(Map.of(
                                "token", token,
                                "user", user));
                    }
                    return ResponseEntity.status(401).body(Map.of("message", "Invalid email or password"));
                })
                .orElseGet(() -> {
                    System.out.println("DEBUG: User NOT found in DB for email: [" + email + "]");
                    return ResponseEntity.status(401).body(Map.of("message", "User not found"));
                });
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        org.springframework.security.core.Authentication authentication = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .map(user -> {
                    user.setPassword(null); // Don't return password
                    return ResponseEntity.ok(user);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, String> updates) {
        try {
            String jwt = token.substring(7);
            String email = jwtUtil.extractUsername(jwt);

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Apply permitted field updates
            if (updates.containsKey("fullName") && updates.get("fullName") != null) {
                user.setFullName(updates.get("fullName").trim());
            }
            if (updates.containsKey("phone")) {
                user.setPhone(updates.get("phone"));
            }
            if (updates.containsKey("address")) {
                user.setAddress(updates.get("address"));
            }
            if (updates.containsKey("medicalHistory")) {
                user.setMedicalHistory(updates.get("medicalHistory"));
            }
            if (updates.containsKey("allergies")) {
                user.setAllergies(updates.get("allergies"));
            }

            User saved = userRepository.save(user);
            System.out.println("Profile updated for user: " + saved.getEmail());

            return ResponseEntity.ok(Map.of(
                    "message", "Profile updated successfully",
                    "user", saved));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
}