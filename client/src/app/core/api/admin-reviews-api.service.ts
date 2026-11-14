import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminReviewDto, AdminReviewInput, AdminReviewQuery } from '../models/admin';
import { Paged } from '../models/finance';
import { apiUrl } from './api-url';
import { buildParams } from './query-params';

@Injectable({ providedIn: 'root' })
export class AdminReviewsApiService {
  private readonly http = inject(HttpClient);

  list(query: AdminReviewQuery): Observable<Paged<AdminReviewDto>> {
    return this.http.get<Paged<AdminReviewDto>>(apiUrl('/api/admin/reviews'), { params: buildParams(query) });
  }

  create(input: AdminReviewInput): Observable<AdminReviewDto> {
    return this.http.post<AdminReviewDto>(apiUrl('/api/admin/reviews'), input);
  }

  update(id: string, input: AdminReviewInput): Observable<AdminReviewDto> {
    return this.http.put<AdminReviewDto>(apiUrl(`/api/admin/reviews/${id}`), input);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(`/api/admin/reviews/${id}`));
  }
}
