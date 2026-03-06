import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface AdherenceDTO {
    patientId: number;
    patientName: string;
    totalDoses: number;
    takenCount: number;
    missedCount: number;
    adherencePercent: number;
    highMissRate: boolean;
}

interface TopMedicine {
    medicineName: string;
    count: number;
}

@Component({
    selector: 'app-schedule-analytics-dashboard',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './schedule-analytics-dashboard.component.html',
    styleUrls: ['./schedule-analytics-dashboard.component.css']
})
export class ScheduleAnalyticsDashboardComponent implements OnInit, AfterViewInit {
    @ViewChild('adherenceChart') adherenceChartRef!: ElementRef;
    @ViewChild('medicineChart') medicineChartRef!: ElementRef;

    adherenceData: AdherenceDTO[] = [];
    topMedicines: TopMedicine[] = [];
    highRiskPatients: AdherenceDTO[] = [];
    loading = true;

    constructor(private http: HttpClient) { }

    ngOnInit(): void {
        this.loadData();
    }

    ngAfterViewInit(): void { }

    loadData(): void {
        this.http.get<AdherenceDTO[]>('http://localhost:8081/api/analytics/schedules/adherence').subscribe({
            next: (data) => {
                this.adherenceData = data;
                this.highRiskPatients = data.filter(d => d.highMissRate);
                this.loading = false;
                setTimeout(() => this.buildCharts(), 100);
            },
            error: () => { this.loading = false; }
        });

        this.http.get<TopMedicine[]>('http://localhost:8081/api/analytics/schedules/top-medicines').subscribe({
            next: (data) => { this.topMedicines = data; }
        });
    }

    buildCharts(): void {
        if (this.adherenceChartRef) {
            new Chart(this.adherenceChartRef.nativeElement, {
                type: 'bar',
                data: {
                    labels: this.adherenceData.map(d => d.patientName),
                    datasets: [{
                        label: 'Adherence %',
                        data: this.adherenceData.map(d => d.adherencePercent),
                        backgroundColor: this.adherenceData.map(d =>
                            d.adherencePercent >= 80 ? '#22c55e' :
                                d.adherencePercent >= 50 ? '#f59e0b' : '#ef4444'),
                        borderRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Patient Adherence Rate (Last 30 Days)', color: '#e2e8f0' }
                    },
                    scales: {
                        y: { min: 0, max: 100, ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
                        x: { ticks: { color: '#94a3b8' }, grid: { color: 'transparent' } }
                    }
                }
            });
        }

        if (this.medicineChartRef && this.topMedicines.length > 0) {
            new Chart(this.medicineChartRef.nativeElement, {
                type: 'doughnut',
                data: {
                    labels: this.topMedicines.map(m => m.medicineName),
                    datasets: [{
                        data: this.topMedicines.map(m => m.count),
                        backgroundColor: [
                            '#6366f1', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899',
                            '#8b5cf6', '#14b8a6', '#f97316', '#84cc16', '#06b6d4'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: { display: true, text: 'Top Scheduled Medicines', color: '#e2e8f0' },
                        legend: { labels: { color: '#94a3b8' } }
                    }
                }
            });
        }
    }
}
