import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DrugInfo {
  rxcui: string;
  brandName: string;
  genericName: string;
  activeIngredient: string;
  manufacturerName: string;
  productType: string;
  routeOfAdministration: string;
  indicationsAndUsage: string;
  dosageAndAdministration: string;
  warnings: string;
  adverseReactions: string;
  patientMedicationInformation: string;
  contraindicationFlags: string[];
  requiresAuthenticityBadge: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DrugDetailService {
  private apiUrl = '/api/drug-info';

  constructor(private http: HttpClient) { }

  getDrugDetails(drugName: string): Observable<DrugInfo> {
    return this.http.get<DrugInfo>(`${this.apiUrl}/${encodeURIComponent(drugName)}`);
  }
}
