package com.medical.backend.repository;

import com.medical.backend.entity.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {
    List<Inventory> findByStatusNot(Inventory.InventoryStatus status);

    List<Inventory> findByPharmacistId(Long pharmacistId);

    List<Inventory> findByDrugName(String drugName);
}
