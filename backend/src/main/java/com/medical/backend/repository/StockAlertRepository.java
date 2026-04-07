package com.medical.backend.repository;

import com.medical.backend.entity.StockAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface StockAlertRepository extends JpaRepository<StockAlert, Long> {
    List<StockAlert> findByIsResolvedFalseOrderByRaisedAtDesc();

    List<StockAlert> findByMedicine_Id(Long medicineId);

    boolean existsByMedicine_IdAndIsResolvedFalse(Long medicineId);
    
    boolean existsByMedicine_IdAndAlertTypeAndIsResolvedFalse(Long medicineId, StockAlert.AlertType alertType);

    java.util.Optional<StockAlert> findFirstByMedicine_IdAndIsResolvedFalse(Long medicineId);
}
