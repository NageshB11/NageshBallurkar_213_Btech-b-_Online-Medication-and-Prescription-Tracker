package com.medical.backend.repository;

import com.medical.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    long countByRole(com.medical.backend.entity.Role role);

    List<User> findByRole(com.medical.backend.entity.Role role);
}
