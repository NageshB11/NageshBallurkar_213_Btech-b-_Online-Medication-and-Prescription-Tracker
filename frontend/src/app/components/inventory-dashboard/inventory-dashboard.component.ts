import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PharmacistService } from '../../services/pharmacist.service';

@Component({
    selector: 'app-inventory-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './inventory-dashboard.component.html',
    styleUrls: ['./inventory-dashboard.component.css']
})
export class InventoryDashboardComponent implements OnInit {
    inventory: any[] = [];
    showAddModalFlag = false;
    editMode = false;
    currentMedicine: any = {
        name: '',
        stockQuantity: 0,
        batchNumber: '',
        expiryDate: '',
        unitPrice: 0,
        description: ''
    };

    constructor(private pharmacistService: PharmacistService) { }

    ngOnInit(): void {
        this.loadInventory();
    }

    loadInventory(): void {
        this.pharmacistService.getInventory().subscribe({
            next: (data) => this.inventory = data,
            error: (err) => console.error('Failed to load inventory', err)
        });
    }

    editMedicine(medicine: any): void {
        this.editMode = true;
        this.currentMedicine = { ...medicine };
        this.showAddModalFlag = true;
    }

    saveMedicine(): void {
        const payload = { ...this.currentMedicine };
        if (!payload.expiryDate) {
            payload.expiryDate = null;
        }

        this.pharmacistService.updateInventory(payload).subscribe({
            next: () => {
                this.loadInventory();
                this.closeModal();
            },
            error: (err) => alert('Failed to save medicine: ' + err.message)
        });
    }

    closeModal(): void {
        this.showAddModalFlag = false;
        this.editMode = false;
        this.currentMedicine = {
            name: '',
            stockQuantity: 0,
            batchNumber: '',
            expiryDate: '',
            unitPrice: 0,
            description: ''
        };
    }
}
