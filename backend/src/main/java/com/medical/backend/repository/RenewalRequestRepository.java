package com.medical.backend.repository;

import com.medical.backend.entity.RenewalRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RenewalRequestRepository extends JpaRepository<RenewalRequest, Long> {
    List<RenewalRequest> findByDoctorIdAndStatus(Long doctorId, RenewalRequest.RequestStatus status);

    List<RenewalRequest> findByPatientId(Long patientId);
}
