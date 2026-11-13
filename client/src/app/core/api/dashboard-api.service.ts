import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardDto } from '../models/finance';
import { apiUrl } from './api-url';
import { buildParams } from './query-params';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);

  get(month?: string): Observable<DashboardDto> {
    return this.http.get<DashboardDto>(apiUrl('/api/dashboard'), { params: buildParams({ month }) });
  }
}
