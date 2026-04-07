package com.medical.backend.repository;

import com.medical.backend.entity.Prescription;
import com.medical.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, Long>, JpaSpecificationExecutor<Prescription> {

    @Query("SELECT p FROM Prescription p WHERE p.patient.id = :patientId ORDER BY p.id DESC")
    List<Prescription> findByPatientIdSorted(@Param("patientId") Long patientId);

    List<Prescription> findByPatient_Email(String email);

    List<Prescription> findByPatientId(Long patientId);

    List<Prescription> findByPatient_Id(Long patientId);

    List<Prescription> findByPatientAndStatus(User patient, Prescription.PrescriptionStatus status);

    @Query("SELECT p FROM Prescription p WHERE p.doctor.id = :doctorId ORDER BY p.id DESC")
    List<Prescription> findByDoctorIdSorted(@Param("doctorId") Long doctorId);

    List<Prescription> findByDoctorId(Long doctorId);

    List<Prescription> findByDoctor_Id(Long doctorId);

    long countByDoctor_Id(Long doctorId);

    long countByDoctor_IdAndStatus(Long doctorId, Prescription.PrescriptionStatus status);

    @Query("SELECT DISTINCT p.patient FROM Prescription p WHERE p.doctor.id = :doctorId")
    List<User> findDistinctPatientsByDoctorId(@Param("doctorId") Long doctorId);

    List<Prescription> findByStatus(Prescription.PrescriptionStatus status);

    List<Prescription> findByStatusInOrderByIdDesc(Collection<Prescription.PrescriptionStatus> statuses);

    long countByDoctor_IdAndCreatedAtAfter(Long doctorId, LocalDateTime createdAt);
}
