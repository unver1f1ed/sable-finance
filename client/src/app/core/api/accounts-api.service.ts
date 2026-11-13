import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AccountDto, AccountInput } from '../models/finance';
import { apiUrl } from './api-url';

@Injectable({ providedIn: 'root' })
export class AccountsApiService {
  private readonly http = inject(HttpClient);

  list(): Observable<AccountDto[]> {
    return this.http.get<AccountDto[]>(apiUrl('/api/accounts'));
  }

  create(input: AccountInput): Observable<AccountDto> {
    return this.http.post<AccountDto>(apiUrl('/api/accounts'), input);
  }

  update(id: string, input: AccountInput): Observable<AccountDto> {
    return this.http.put<AccountDto>(apiUrl(`/api/accounts/${id}`), input);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(apiUrl(`/api/accounts/${id}`));
  }
}
