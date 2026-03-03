package com.medical.backend.repository;

import com.medical.backend.entity.HealthVitals;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HealthVitalsRepository extends JpaRepository<HealthVitals, Long> {
    List<HealthVitals> findByPatientIdOrderByRecordDateDesc(Long patientId);
}
