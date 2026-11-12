import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { apiUrl } from '../../../core/api/api-url';
import { SKIP_ERROR_TOAST } from '../../../core/api/http-context';

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
    return this.http.post<ContactResponse>(apiUrl('/api/contact'), request, {
      context: new HttpContext().set(SKIP_ERROR_TOAST, true),
    });
  }
}
