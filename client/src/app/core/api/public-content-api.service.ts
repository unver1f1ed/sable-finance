import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { FaqTopicDto, PlanComparisonDto, ReviewsDto } from '../models/public-content';
import { apiUrl } from './api-url';
import { SKIP_ERROR_TOAST } from './http-context';

@Injectable({ providedIn: 'root' })
export class PublicContentApiService {
  private readonly http = inject(HttpClient);

  plans(fresh = false): Observable<PlanComparisonDto> {
    return this.http.get<PlanComparisonDto>(apiUrl('/api/plans'), this.options(fresh));
  }

  reviews(fresh = false): Observable<ReviewsDto> {
    return this.http.get<ReviewsDto>(apiUrl('/api/reviews'), this.options(fresh));
  }

  faq(fresh = false): Observable<FaqTopicDto[]> {
    return this.http.get<FaqTopicDto[]>(apiUrl('/api/faq'), this.options(fresh));
  }

  // The API answers these with a short public cache lifetime; after an admin change a unique
  // query value makes the browser skip that cached copy.
  private options(fresh: boolean): { context: HttpContext; params?: HttpParams } {
    const context = new HttpContext().set(SKIP_ERROR_TOAST, true);
    return fresh ? { context, params: new HttpParams().set('_', String(Date.now())) } : { context };
  }
}
