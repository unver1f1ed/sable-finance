import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminFaqItemDto, AdminFaqItemInput, AdminFaqTopicDto } from '../models/admin';
import { apiUrl } from './api-url';
import { buildParams } from './query-params';

@Injectable({ providedIn: 'root' })
export class AdminFaqApiService {
  private readonly http = inject(HttpClient);

  topics(): Observable<AdminFaqTopicDto[]> {
    return this.http.get<AdminFaqTopicDto[]>(apiUrl('/api/admin/faq/topics'));
  }

  createTopic(name: string): Observable<AdminFaqTopicDto> {
    return this.http.post<AdminFaqTopicDto>(apiUrl('/api/admin/faq/topics'), { name });
  }

  deleteTopic(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(`/api/admin/faq/topics/${id}`));
  }

  items(query: { search?: string | null; topicId?: string | null }): Observable<AdminFaqItemDto[]> {
    return this.http.get<AdminFaqItemDto[]>(apiUrl('/api/admin/faq/items'), { params: buildParams(query) });
  }

  createItem(input: AdminFaqItemInput): Observable<AdminFaqItemDto> {
    return this.http.post<AdminFaqItemDto>(apiUrl('/api/admin/faq/items'), input);
  }

  updateItem(id: string, input: AdminFaqItemInput): Observable<AdminFaqItemDto> {
    return this.http.put<AdminFaqItemDto>(apiUrl(`/api/admin/faq/items/${id}`), input);
  }

  deleteItem(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(`/api/admin/faq/items/${id}`));
  }
}
