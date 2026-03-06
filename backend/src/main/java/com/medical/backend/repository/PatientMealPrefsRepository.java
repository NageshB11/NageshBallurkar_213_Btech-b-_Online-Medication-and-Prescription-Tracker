package com.medical.backend.repository;

import com.medical.backend.entity.PatientMealPrefs;
import com.medical.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PatientMealPrefsRepository extends JpaRepository<PatientMealPrefs, Long> {
    Optional<PatientMealPrefs> findByPatient(User patient);

    Optional<PatientMealPrefs> findByPatient_Id(Long patientId);
}
