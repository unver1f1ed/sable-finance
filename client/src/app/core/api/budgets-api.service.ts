import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BudgetDto, BudgetInput, BudgetSummary } from '../models/finance';
import { apiUrl } from './api-url';
import { buildParams } from './query-params';

@Injectable({ providedIn: 'root' })
export class BudgetsApiService {
  private readonly http = inject(HttpClient);

  summary(month?: string): Observable<BudgetSummary> {
    return this.http.get<BudgetSummary>(apiUrl('/api/budgets'), { params: buildParams({ month }) });
  }

  create(input: BudgetInput): Observable<BudgetDto> {
    return this.http.post<BudgetDto>(apiUrl('/api/budgets'), input);
  }

  update(id: string, limitAmount: number): Observable<BudgetDto> {
    return this.http.put<BudgetDto>(apiUrl(`/api/budgets/${id}`), { limitAmount });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(`/api/budgets/${id}`));
  }
}
