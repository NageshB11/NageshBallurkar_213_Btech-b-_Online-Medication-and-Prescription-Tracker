package com.medical.backend.repository;

import com.medical.backend.entity.AdherenceLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AdherenceLogRepository extends JpaRepository<AdherenceLog, Long> {
    List<AdherenceLog> findByPatientId(Long patientId);

    List<AdherenceLog> findByPrescriptionId(Long prescriptionId);
}
