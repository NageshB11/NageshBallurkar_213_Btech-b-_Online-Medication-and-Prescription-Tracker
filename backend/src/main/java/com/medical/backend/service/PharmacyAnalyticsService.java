package com.medical.backend.service;

import com.medical.backend.dto.ExpiryInsightDTO;
import com.medical.backend.dto.PharmacyIntelligenceDTO;
import com.medical.backend.dto.StockOptimizationDTO;
import com.medical.backend.entity.Inventory;
import com.medical.backend.repository.InventoryRepository;
import com.medical.backend.repository.PrescriptionItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PharmacyAnalyticsService {

    @Autowired
    private InventoryRepository inventoryRepository;

    @Autowired
    private PrescriptionItemRepository itemRepository;

    public PharmacyIntelligenceDTO getPharmacyIntelligence() {
        return PharmacyIntelligenceDTO.builder()
                .topSelling(getTopSellingByVolume(10))
                .stockOptimization(getStockOptimizationReport())
                .expiryInsights(getExpiryInsights())
                .build();
    }

    private List<StockOptimizationDTO> getTopSellingByVolume(int limit) {
        // We aggregate PrescriptionItems from DISPENSED prescriptions
        // Note: Using a simplified approach by medicineName. 
        // In a real system, this would be by a unique medicine ID/RXCUI.
        LocalDate thirtyDaysAgo = LocalDate.now().minusDays(30);
        
        // Custom query would be better here, but for mock-heavy environments 
        // we'll simulate logic if data is sparse.
        List<Object[]> results = itemRepository.findTopSellingMedicines(thirtyDaysAgo.atStartOfDay());
        
        return results.stream()
                .limit(limit)
                .map(res -> {
                    String name = (String) res[0];
                    Long totalSold = (Long) res[1];
                    
                    // Fetch current stock for this name
                    Integer stock = inventoryRepository.findByDrugName(name)
                            .stream().mapToInt(Inventory::getQuantity).sum();
                            
                    return StockOptimizationDTO.builder()
                            .productName(name)
                            .totalUnitsSold(totalSold)
                            .currentStock(stock)
                            .build();
                })
                .collect(Collectors.toList());
    }

    private List<StockOptimizationDTO> getStockOptimizationReport() {
        List<Inventory> allInventory = inventoryRepository.findAll();
        LocalDate thirtyDaysAgo = LocalDate.now().minusDays(30);
        
        // Calculate daily avg sales for ROP
        Map<String, Long> totalSales = itemRepository.findTopSellingMedicines(thirtyDaysAgo.atStartOfDay()).stream()
                .collect(Collectors.toMap(res -> (String)res[0], res -> (Long)res[1], (a, b) -> a));

        return allInventory.stream()
                .map(inv -> {
                    long sold = totalSales.getOrDefault(inv.getDrugName(), 0L);
                    double avgDaily = sold / 30.0;
                    int leadTime = 3; // Standard 3-day lead time
                    int safetyStock = inv.getThreshold() != null ? inv.getThreshold() : 10;
                    
                    // ROP = (d * L) + ss
                    double rop = (avgDaily * leadTime) + safetyStock;
                    
                    String status = "OPTIMIZED";
                    if (inv.getQuantity() <= rop) {
                        status = "CRITICAL";
                    } else if (inv.getQuantity() > rop * 2) {
                        status = "OVERSTOCK";
                    }

                    return StockOptimizationDTO.builder()
                            .productName(inv.getDrugName())
                            .currentStock(inv.getQuantity())
                            .totalUnitsSold(sold)
                            .reorderPoint(Math.round(rop * 10.0) / 10.0)
                            .status(status)
                            .build();
                })
                .collect(Collectors.toList());
    }

    private ExpiryInsightDTO getExpiryInsights() {
        List<Inventory> all = inventoryRepository.findAll();
        LocalDate today = LocalDate.now();
        
        int within30 = 0, within60 = 0, within90 = 0, expired = 0;
        
        for (Inventory inv : all) {
            LocalDate exp = inv.getExpiryDate();
            if (exp.isBefore(today)) {
                expired++;
            } else {
                long days = ChronoUnit.DAYS.between(today, exp);
                if (days <= 30) within30++;
                else if (days <= 60) within60++;
                else if (days <= 90) within90++;
            }
        }
        
        return ExpiryInsightDTO.builder()
                .within30Days(within30)
                .within60Days(within60)
                .within90Days(within90)
                .totalExpired(expired)
                .build();
    }
}
