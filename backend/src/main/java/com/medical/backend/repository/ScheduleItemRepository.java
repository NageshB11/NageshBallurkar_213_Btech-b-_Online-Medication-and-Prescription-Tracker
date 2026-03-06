package com.medical.backend.repository;

import com.medical.backend.entity.ScheduleItem;
import com.medical.backend.entity.MedicationSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ScheduleItemRepository extends JpaRepository<ScheduleItem, Long> {
    List<ScheduleItem> findBySchedule(MedicationSchedule schedule);

    List<ScheduleItem> findBySchedule_Id(Long scheduleId);

    @Query("SELECT si FROM ScheduleItem si WHERE si.medicine.id = :medicineId " +
            "AND si.schedule.status = 'ACTIVE'")
    List<ScheduleItem> findActiveItemsByMedicineId(@Param("medicineId") Long medicineId);

    @Query("SELECT DISTINCT si.schedule.patient FROM ScheduleItem si " +
            "WHERE si.medicine.id = :medicineId AND si.schedule.status = 'ACTIVE'")
    List<com.medical.backend.entity.User> findPatientsByActiveMedicine(@Param("medicineId") Long medicineId);
}
