package com.medical.backend.repository;

import com.medical.backend.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.time.LocalDateTime;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {

    List<Prescription> findByPatient_Id(Long patientId);

    List<Prescription> findByPatientId(Long patientId);

    List<Prescription> findByDoctor_Id(Long doctorId);

    long countByDoctor_Id(Long doctorId);

    long countByDoctor_IdAndStatus(Long doctorId, Prescription.PrescriptionStatus status);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT p.patient FROM Prescription p WHERE p.doctor.id = :doctorId")
    List<com.medical.backend.entity.User> findDistinctPatientsByDoctorId(
            @org.springframework.data.repository.query.Param("doctorId") Long doctorId);

    List<Prescription> findByStatus(Prescription.PrescriptionStatus status);

    long countByDoctor_IdAndCreatedAtAfter(Long doctorId, LocalDateTime createdAt);
}
