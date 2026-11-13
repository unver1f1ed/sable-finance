import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BudgetSummary } from '../models/finance';
import { apiUrl } from './api-url';
import { buildParams } from './query-params';

@Injectable({ providedIn: 'root' })
export class BudgetsApiService {
  private readonly http = inject(HttpClient);

  summary(month?: string): Observable<BudgetSummary> {
    return this.http.get<BudgetSummary>(apiUrl('/api/budgets'), { params: buildParams({ month }) });
  }
}
