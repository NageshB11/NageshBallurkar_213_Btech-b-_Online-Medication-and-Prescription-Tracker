import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface StockAlert {
    id: number;
    alertType: string;
    raisedAt: string;
    isResolved: boolean;
    medicine?: { name: string; id: number };
}

@Component({
    selector: 'app-stock-alert-panel',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './stock-alert-panel.component.html',
    styleUrls: ['./stock-alert-panel.component.css']
})
export class StockAlertPanelComponent implements OnInit {
    alerts: StockAlert[] = [];
    loading = true;

    constructor(private http: HttpClient) { }

    ngOnInit(): void {
        this.loadAlerts();
    }

    loadAlerts(): void {
        this.http.get<StockAlert[]>('http://localhost:8081/api/stock-alerts/active').subscribe({
            next: (data) => { this.alerts = data; this.loading = false; },
            error: () => { this.loading = false; }
        });
    }

    resolve(id: number): void {
        this.http.patch(`http://localhost:8081/api/stock-alerts/${id}/resolve`, {}).subscribe({
            next: () => { this.alerts = this.alerts.filter(a => a.id !== id); }
        });
    }

    alertBadgeClass(type: string): string {
        return type === 'OUT_OF_STOCK' ? 'badge-critical' : 'badge-warning';
    }

    formatDate(dt: string): string {
        return new Date(dt).toLocaleString();
    }
}
