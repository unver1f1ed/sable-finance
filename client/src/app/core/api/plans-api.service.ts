import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PlanComparisonDto } from '../models/public-content';
import { apiUrl } from './api-url';

@Injectable({ providedIn: 'root' })
export class PlansApiService {
  private readonly http = inject(HttpClient);

  get(): Observable<PlanComparisonDto> {
    return this.http.get<PlanComparisonDto>(apiUrl('/api/plans'));
  }
}
