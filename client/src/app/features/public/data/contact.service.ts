import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ContactRequest {
  name: string;
  email: string;
  topic: string;
  message: string;
  consent: boolean;
}

export interface ContactResponse {
  id: string;
}

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly http = inject(HttpClient);

  send(request: ContactRequest): Observable<ContactResponse> {
    return this.http.post<ContactResponse>(`${environment.apiUrl}/api/contact`, request);
  }
}
