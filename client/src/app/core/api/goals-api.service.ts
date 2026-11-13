import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { GoalDto } from '../models/finance';
import { apiUrl } from './api-url';
import { buildParams } from './query-params';

@Injectable({ providedIn: 'root' })
export class GoalsApiService {
  private readonly http = inject(HttpClient);

  list(includeArchived = false): Observable<GoalDto[]> {
    return this.http.get<GoalDto[]>(apiUrl('/api/goals'), { params: buildParams({ includeArchived: includeArchived || null }) });
  }
}
