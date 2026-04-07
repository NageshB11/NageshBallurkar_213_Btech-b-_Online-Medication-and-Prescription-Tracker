package com.medical.backend.repository;

import com.medical.backend.entity.DoseLog;
import com.medical.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
@org.springframework.stereotype.Repository
public interface DoseLogRepository extends JpaRepository<DoseLog, Long> {

        List<DoseLog> findByPatientOrderByScheduledTimeDesc(User patient);

        @Query("SELECT d FROM DoseLog d WHERE d.patient = :patient " +
                        "AND d.scheduledTime >= :start AND d.scheduledTime < :end " +
                        "ORDER BY d.scheduledTime ASC")
        List<DoseLog> findByPatientAndDateRange(@Param("patient") User patient,
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);

        @Query("SELECT d FROM DoseLog d WHERE d.status = :status " +
                        "AND d.scheduledTime < :cutoff")
        List<DoseLog> findByStatusAndScheduledTimeBefore(@Param("status") DoseLog.DoseStatus status,
                        @Param("cutoff") LocalDateTime cutoff);

        @Query("SELECT d FROM DoseLog d WHERE d.status IN :statuses " +
                        "AND d.scheduledTime < :cutoff")
        List<DoseLog> findPendingBefore(@Param("statuses") List<DoseLog.DoseStatus> statuses, @Param("cutoff") LocalDateTime cutoff);

        @Query("SELECT d FROM DoseLog d WHERE d.scheduleItem.id = :itemId " +
                        "AND d.scheduledTime >= :start AND d.scheduledTime < :end")
        List<DoseLog> findByScheduleItemAndDateRange(@Param("itemId") Long itemId,
                        @Param("start") LocalDateTime start,
                        @Param("end") LocalDateTime end);

        List<DoseLog> findByPrescriptionIdOrderByDateAscMealAsc(Long prescriptionId);

        long countByPrescriptionId(Long prescriptionId);

        long countByPrescriptionIdAndIsTakenTrue(Long prescriptionId);
}
