package com.medical.backend.repository;

import com.medical.backend.entity.ScheduleAudit;
import com.medical.backend.entity.MedicationSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ScheduleAuditRepository extends JpaRepository<ScheduleAudit, Long> {
    List<ScheduleAudit> findByScheduleOrderByChangedAtDesc(MedicationSchedule schedule);

    List<ScheduleAudit> findBySchedule_IdOrderByChangedAtDesc(Long scheduleId);
}
