import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminUserDto, AdminUserInput, AdminUserQuery, AdminUserStats } from '../models/admin';
import { Paged } from '../models/finance';
import { apiUrl } from './api-url';
import { buildParams } from './query-params';

@Injectable({ providedIn: 'root' })
export class AdminUsersApiService {
  private readonly http = inject(HttpClient);

  list(query: AdminUserQuery): Observable<Paged<AdminUserDto>> {
    return this.http.get<Paged<AdminUserDto>>(apiUrl('/api/admin/users'), { params: buildParams(query) });
  }

  stats(): Observable<AdminUserStats> {
    return this.http.get<AdminUserStats>(apiUrl('/api/admin/users/stats'));
  }

  update(id: string, input: AdminUserInput): Observable<AdminUserDto> {
    return this.http.put<AdminUserDto>(apiUrl(`/api/admin/users/${id}`), input);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(`/api/admin/users/${id}`));
  }
}
