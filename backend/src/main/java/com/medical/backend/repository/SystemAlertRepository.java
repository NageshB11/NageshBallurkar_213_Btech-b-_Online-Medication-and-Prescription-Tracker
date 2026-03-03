package com.medical.backend.repository;

import com.medical.backend.entity.SystemAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SystemAlertRepository extends JpaRepository<SystemAlert, Long> {
    List<SystemAlert> findByIsResolvedFalseOrderByTimestampDesc();
}
