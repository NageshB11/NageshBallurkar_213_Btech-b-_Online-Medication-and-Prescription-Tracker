package com.medical.backend.repository;

import com.medical.backend.entity.SystemAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SystemAuditRepository extends JpaRepository<SystemAudit, Long> {
    List<SystemAudit> findAllByOrderByTimestampDesc();
}
