package com.medical.backend.repository;

import com.medical.backend.entity.AlertLog;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertLogRepository extends JpaRepository<AlertLog, Long>, JpaSpecificationExecutor<AlertLog> {

    List<AlertLog> findTop20ByOrderByTimestampDesc();

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "DELETE FROM alert_logs", nativeQuery = true)
    void truncateTable();

    long count();
}
