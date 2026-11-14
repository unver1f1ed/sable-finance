import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminFeatureDto, AdminFeatureInput, AdminPlanDto, AdminPlanInput } from '../models/admin';
import { apiUrl } from './api-url';

@Injectable({ providedIn: 'root' })
export class AdminPlansApiService {
  private readonly http = inject(HttpClient);

  plans(): Observable<AdminPlanDto[]> {
    return this.http.get<AdminPlanDto[]>(apiUrl('/api/admin/plans'));
  }

  updatePlan(id: string, input: AdminPlanInput): Observable<AdminPlanDto> {
    return this.http.put<AdminPlanDto>(apiUrl(`/api/admin/plans/${id}`), input);
  }

  features(): Observable<AdminFeatureDto[]> {
    return this.http.get<AdminFeatureDto[]>(apiUrl('/api/admin/plan-features'));
  }

  createFeature(input: AdminFeatureInput): Observable<AdminFeatureDto> {
    return this.http.post<AdminFeatureDto>(apiUrl('/api/admin/plan-features'), input);
  }

  updateFeature(id: string, input: AdminFeatureInput): Observable<AdminFeatureDto> {
    return this.http.put<AdminFeatureDto>(apiUrl(`/api/admin/plan-features/${id}`), input);
  }

  deleteFeature(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(`/api/admin/plan-features/${id}`));
  }

  reorderFeatures(ids: string[]): Observable<void> {
    return this.http.put<void>(apiUrl('/api/admin/plan-features/order'), { ids });
  }
}
