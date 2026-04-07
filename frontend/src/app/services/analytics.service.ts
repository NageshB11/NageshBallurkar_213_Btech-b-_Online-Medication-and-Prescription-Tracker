import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdherenceDataPoint {
  date: string;
  percentage: number | null;
}

export interface StockOptimizationDTO {
  productName: string;
  currentStock: number;
  totalUnitsSold: number;
  reorderPoint: number;
  status: string;
}

export interface ExpiryInsightDTO {
  within30Days: number;
  within60Days: number;
  within90Days: number;
  totalExpired: number;
}

export interface PharmacyIntelligenceDTO {
  topSelling: StockOptimizationDTO[];
  stockOptimization: StockOptimizationDTO[];
  expiryInsights: ExpiryInsightDTO;
}

export interface MonthlyMatrixPoint {
  month: string;
  countIssued: number;
  avgAdherence: number;
}

export interface RiskPatientDTO {
  patientId: number;
  patientName: string;
  patientEmail: string;
  adherenceScore: number;
  riskStatus: string;
}

export interface DoctorAnalyticsSummaryDTO {
  monthlyMatrix: MonthlyMatrixPoint[];
  riskList: RiskPatientDTO[];
  kpiTotalPatients: number;
  kpiSuccessRate: number;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private apiUrl = '/api/analytics';
  private pharmaUrl = '/api/pharma/analytics';

  constructor(private http: HttpClient) {}

  getAdherenceTrend(patientId: number, month?: number, year?: number): Observable<AdherenceDataPoint[]> {
    let url = `${this.apiUrl}/adherence-trend/${patientId}?`;
    if (month && year) {
      url += `month=${month}&year=${year}`;
    }
    return this.http.get<AdherenceDataPoint[]>(url);
  }

  getPharmacyIntelligence(): Observable<PharmacyIntelligenceDTO> {
    return this.http.get<PharmacyIntelligenceDTO>(`${this.pharmaUrl}/inventory-insights`);
  }

  getDoctorAnalyticsSummary(): Observable<DoctorAnalyticsSummaryDTO> {
    return this.http.get<DoctorAnalyticsSummaryDTO>(`/api/doctor/analytics-summary`);
  }

  getOverallAdherenceScore(patientId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/adherence-score/${patientId}`);
  }
}
