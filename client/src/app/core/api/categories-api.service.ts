import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CategoryDto, TransactionType } from '../models/finance';
import { apiUrl } from './api-url';
import { buildParams } from './query-params';

@Injectable({ providedIn: 'root' })
export class CategoriesApiService {
  private readonly http = inject(HttpClient);

  list(type?: TransactionType): Observable<CategoryDto[]> {
    return this.http.get<CategoryDto[]>(apiUrl('/api/categories'), { params: buildParams({ type }) });
  }
}
