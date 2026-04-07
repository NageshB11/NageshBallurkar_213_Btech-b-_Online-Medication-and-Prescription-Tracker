import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DrugProfile {
    brandName: string;
    genericName: string;
    manufacturer: string;
    usageInstructions: string[];
    contraindications: string[];
    pregnancyWarning: boolean;
    alcoholWarning: boolean;
    countryOfOrigin: string;
    drugInteractions: string[];
    foodInteractions: string[];
    purpose: string;
    storageAdvice: string;
    missedDoseAdvice: string;
    activeIngredients: string[];
    pharmacologicalCategory: string;
    pillImageUrl: string;
    healthConditionContraindications: string[];
    batchNumber: string;
    expiryDate: string;
}

import { AuthService } from './auth.service';
import { HttpHeaders } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class ExternalDrugService {
    private apiUrl = '/api/drug-info';

    constructor(private http: HttpClient, private authService: AuthService) { }

    private getHeaders(): HttpHeaders {
        const token = this.authService.getToken();
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });
    }

    getDrugProfile(name: string): Observable<DrugProfile> {
        return this.http.get<DrugProfile>(`${this.apiUrl}/profile?name=${name}`, { headers: this.getHeaders() });
    }
}
