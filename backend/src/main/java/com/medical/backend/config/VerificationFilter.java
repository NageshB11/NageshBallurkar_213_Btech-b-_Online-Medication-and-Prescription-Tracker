package com.medical.backend.config;

import com.medical.backend.entity.User;
import com.medical.backend.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class VerificationFilter extends OncePerRequestFilter {

    @Autowired
    private com.medical.backend.repository.SystemAuditRepository systemAuditRepository;

    @Autowired
    private UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.isAuthenticated()) {
            String role = authentication.getAuthorities().stream()
                    .map(auth -> auth.getAuthority())
                    .findFirst()
                    .orElse("");

            if (role.equals("ROLE_DOCTOR") || role.equals("ROLE_PHARMACIST")) {
                String email = authentication.getName();
                User user = userRepository.findByEmail(email).orElse(null);

                if (user != null && !user.isVerified()) {
                    // Log the 403 attempt to System Audit
                    com.medical.backend.entity.SystemAudit audit = new com.medical.backend.entity.SystemAudit();
                    audit.setAction("CREDENTIAL_GATE_BLOCK");
                    audit.setDetails(
                            "Unverified " + role + " (" + email + ") attempted access to: " + request.getRequestURI());
                    systemAuditRepository.save(audit);

                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write("Account pending Admin approval. Access blocked.");
                    response.getWriter().flush();
                    return; // Block request
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
