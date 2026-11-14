import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ContributionInput, GoalDto, GoalInput } from '../models/finance';
import { apiUrl } from './api-url';
import { buildParams } from './query-params';

@Injectable({ providedIn: 'root' })
export class GoalsApiService {
  private readonly http = inject(HttpClient);

  list(includeArchived = false): Observable<GoalDto[]> {
    return this.http.get<GoalDto[]>(apiUrl('/api/goals'), { params: buildParams({ includeArchived: includeArchived || null }) });
  }

  create(input: GoalInput): Observable<GoalDto> {
    return this.http.post<GoalDto>(apiUrl('/api/goals'), input);
  }

  update(id: string, input: GoalInput): Observable<GoalDto> {
    return this.http.put<GoalDto>(apiUrl(`/api/goals/${id}`), input);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(`/api/goals/${id}`));
  }

  archive(id: string): Observable<GoalDto> {
    return this.http.post<GoalDto>(apiUrl(`/api/goals/${id}/archive`), {});
  }

  contribute(id: string, input: ContributionInput): Observable<GoalDto> {
    return this.http.post<GoalDto>(apiUrl(`/api/goals/${id}/contributions`), input);
  }
}
