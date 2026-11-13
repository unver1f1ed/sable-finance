import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { TransactionDto, TransactionInput, TransactionList, TransactionQuery } from '../models/finance';
import { apiUrl } from './api-url';
import { buildParams } from './query-params';

@Injectable({ providedIn: 'root' })
export class TransactionsApiService {
  private readonly http = inject(HttpClient);

  list(query: TransactionQuery): Observable<TransactionList> {
    return this.http.get<TransactionList>(apiUrl('/api/transactions'), { params: buildParams(query) });
  }

  get(id: string): Observable<TransactionDto> {
    return this.http.get<TransactionDto>(apiUrl(`/api/transactions/${id}`));
  }

  create(input: TransactionInput): Observable<TransactionDto> {
    return this.http.post<TransactionDto>(apiUrl('/api/transactions'), input);
  }

  update(id: string, input: TransactionInput): Observable<TransactionDto> {
    return this.http.put<TransactionDto>(apiUrl(`/api/transactions/${id}`), input);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(`/api/transactions/${id}`));
  }

  exportCsv(query: TransactionQuery): Observable<HttpResponse<Blob>> {
    const filters: TransactionQuery = { ...query, page: null, pageSize: null };
    return this.http.get(apiUrl('/api/transactions/export'), {
      params: buildParams(filters),
      responseType: 'blob',
      observe: 'response',
    });
  }
}
