package com.medical.backend.controller;

import com.medical.backend.entity.Inventory;
import com.medical.backend.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {
    private final InventoryService inventoryService;

    @GetMapping
    public List<Inventory> getAll() {
        return inventoryService.getAllInventory();
    }

    @GetMapping("/pharmacist/{id}")
    public List<Inventory> getByPharmacist(@PathVariable("id") Long id) {
        return inventoryService.getPharmacistInventory(id);
    }

    @PostMapping
    public Inventory add(@RequestBody Inventory inventory) {
        return inventoryService.addStock(inventory);
    }

    @PutMapping("/{id}")
    public Inventory update(@PathVariable("id") Long id, @RequestBody Inventory details) {
        return inventoryService.updateStock(id, details);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> archive(@PathVariable("id") Long id) {
        inventoryService.archiveStock(id);
        return ResponseEntity.ok().build();
    }
}
