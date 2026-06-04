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

            System.out.println("═══════════════════════════════════════════════════════");
        };
    }
}
