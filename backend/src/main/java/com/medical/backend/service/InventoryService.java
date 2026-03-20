package com.medical.backend.service;

import com.medical.backend.entity.Inventory;
import com.medical.backend.entity.Notification;
import com.medical.backend.entity.User;
import com.medical.backend.repository.InventoryRepository;
import com.medical.backend.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InventoryService {
    private final InventoryRepository inventoryRepository;
    private final NotificationRepository notificationRepository;

    public List<Inventory> getAllInventory() {
        return inventoryRepository.findByStatusNot(Inventory.InventoryStatus.ARCHIVED);
    }

    public List<Inventory> getPharmacistInventory(Long pharmacistId) {
        return inventoryRepository.findByPharmacistId(pharmacistId);
    }

    @Transactional
    public Inventory addStock(Inventory inventory) {
        checkAndSetStatus(inventory);
        Inventory saved = inventoryRepository.save(inventory);
        checkThresholdsAndNotify(saved);
        return saved;
    }

    @Transactional
    public Inventory updateStock(Long id, Inventory details) {
        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inventory not found"));

        inventory.setDrugName(details.getDrugName());
        inventory.setBatchNo(details.getBatchNo());
        inventory.setExpiryDate(details.getExpiryDate());
        inventory.setQuantity(details.getQuantity());
        inventory.setThreshold(details.getThreshold());

        checkAndSetStatus(inventory);
        Inventory updated = inventoryRepository.save(inventory);
        checkThresholdsAndNotify(updated);
        return updated;
    }

    @Transactional
    public void archiveStock(Long id) {
        Inventory inventory = inventoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inventory not found"));
        inventory.setStatus(Inventory.InventoryStatus.ARCHIVED);
        inventoryRepository.save(inventory);
    }

    @Transactional
    public void decrementStock(String drugName, int amount) {
        // Simple logic: find earliest expiring ACTIVE stock for this drug
        List<Inventory> stocks = inventoryRepository.findAll().stream()
                .filter(i -> i.getDrugName().equalsIgnoreCase(drugName))
                .filter(i -> i.getStatus() == Inventory.InventoryStatus.ACTIVE
                        || i.getStatus() == Inventory.InventoryStatus.LOW_STOCK)
                .sorted((a, b) -> a.getExpiryDate().compareTo(b.getExpiryDate()))
                .toList();

        int remainingToDecrement = amount;
        for (Inventory stock : stocks) {
            if (remainingToDecrement <= 0)
                break;

            int currentQty = stock.getQuantity();
            int decrement = Math.min(currentQty, remainingToDecrement);

            stock.setQuantity(currentQty - decrement);
            remainingToDecrement -= decrement;

            checkAndSetStatus(stock);
            inventoryRepository.save(stock);
            checkThresholdsAndNotify(stock);
        }
    }

    private void checkAndSetStatus(Inventory inventory) {
        if (inventory.getExpiryDate().isBefore(LocalDate.now())) {
            inventory.setStatus(Inventory.InventoryStatus.EXPIRED);
        } else if (inventory.getQuantity() <= inventory.getThreshold()) {
            inventory.setStatus(Inventory.InventoryStatus.LOW_STOCK);
        } else {
            inventory.setStatus(Inventory.InventoryStatus.ACTIVE);
        }
    }

    private void checkThresholdsAndNotify(Inventory inventory) {
        if (inventory.getStatus() == Inventory.InventoryStatus.LOW_STOCK) {
            createNotification(inventory.getPharmacist(),
                    "Low Stock Alert: " + inventory.getDrugName() + " (Batch: " + inventory.getBatchNo()
                            + ") is below threshold.",
                    "WARNING");
        } else if (inventory.getStatus() == Inventory.InventoryStatus.EXPIRED) {
            createNotification(inventory.getPharmacist(),
                    "Expiry Alert: " + inventory.getDrugName() + " (Batch: " + inventory.getBatchNo()
                            + ") has expired.",
                    "CRITICAL");
        }
    }

    private void createNotification(User user, String message, String type) {
        if (user == null)
            return;
        Notification notif = new Notification();
        notif.setUser(user);
        notif.setMessage(message);
        notif.setType(type);
        notificationRepository.save(notif);
    }

    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void dailyExpiryCheck() {
        List<Inventory> allActive = inventoryRepository.findByStatusNot(Inventory.InventoryStatus.ARCHIVED);
        for (Inventory inv : allActive) {
            if (inv.getExpiryDate().isBefore(LocalDate.now()) && inv.getStatus() != Inventory.InventoryStatus.EXPIRED) {
                inv.setStatus(Inventory.InventoryStatus.EXPIRED);
                inventoryRepository.save(inv);
                createNotification(inv.getPharmacist(),
                        "Daily Scan: " + inv.getDrugName() + " (Batch: " + inv.getBatchNo() + ") is now EXPIRED.",
                        "CRITICAL");
            }
        }
    }
}
