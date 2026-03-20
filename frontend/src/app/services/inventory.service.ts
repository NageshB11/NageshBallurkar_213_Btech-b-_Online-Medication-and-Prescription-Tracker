import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface Inventory {
    id?: number;
    pharmacist?: any;
    drugName: string;
    batchNo: string;
    expiryDate: string;
    quantity: number;
    threshold: number;
    status: 'ACTIVE' | 'LOW_STOCK' | 'EXPIRED' | 'ARCHIVED';
}

@Injectable({
    providedIn: 'root'
})
export class InventoryService {
    private apiUrl = 'http://localhost:8081/api/inventory';

    constructor(private http: HttpClient, private authService: AuthService) { }

    private getHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        return new HttpHeaders().set('Authorization', `Bearer ${token}`);
    }

    getAll(): Observable<Inventory[]> {
        return this.http.get<Inventory[]>(this.apiUrl, { headers: this.getHeaders() });
    }

    getPharmacistInventory(id: number): Observable<Inventory[]> {
        return this.http.get<Inventory[]>(`${this.apiUrl}/pharmacist/${id}`, { headers: this.getHeaders() });
    }

    add(inventory: Inventory): Observable<Inventory> {
        return this.http.post<Inventory>(this.apiUrl, inventory, { headers: this.getHeaders() });
    }

    update(id: number, inventory: Inventory): Observable<Inventory> {
        return this.http.put<Inventory>(`${this.apiUrl}/${id}`, inventory, { headers: this.getHeaders() });
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
    }
}
