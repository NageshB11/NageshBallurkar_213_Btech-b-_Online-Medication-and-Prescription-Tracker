package com.medical.backend.repository;

import com.medical.backend.entity.MedicationSchedule;
import com.medical.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MedicationScheduleRepository extends JpaRepository<MedicationSchedule, Long> {
    List<MedicationSchedule> findByPatient(User patient);

    List<MedicationSchedule> findByPatientAndStatus(User patient, MedicationSchedule.ScheduleStatus status);

    List<MedicationSchedule> findByPatient_Id(Long patientId);
}
