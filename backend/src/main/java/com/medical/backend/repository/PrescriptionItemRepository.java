package com.medical.backend.repository;

import com.medical.backend.entity.PrescriptionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PrescriptionItemRepository extends JpaRepository<PrescriptionItem, Long> {
    
    @Query("SELECT i.medicineName, SUM(i.quantity) FROM PrescriptionItem i " +
           "WHERE i.prescription.status = 'DISPENSED' " +
           "AND i.prescription.createdAt >= :since " +
           "GROUP BY i.medicineName ORDER BY SUM(i.quantity) DESC")
    List<Object[]> findTopSellingMedicines(@Param("since") LocalDateTime since);
}
