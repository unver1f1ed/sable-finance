import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { FaqTopicDto, PlanComparisonDto, ReviewsDto } from '../models/public-content';
import { apiUrl } from './api-url';
import { SKIP_ERROR_TOAST } from './http-context';

@Injectable({ providedIn: 'root' })
export class PublicContentApiService {
  private readonly http = inject(HttpClient);

  plans(): Observable<PlanComparisonDto> {
    return this.http.get<PlanComparisonDto>(apiUrl('/api/plans'), this.quiet());
  }

  reviews(): Observable<ReviewsDto> {
    return this.http.get<ReviewsDto>(apiUrl('/api/reviews'), this.quiet());
  }

  faq(): Observable<FaqTopicDto[]> {
    return this.http.get<FaqTopicDto[]>(apiUrl('/api/faq'), this.quiet());
  }

  private quiet(): { context: HttpContext } {
    return { context: new HttpContext().set(SKIP_ERROR_TOAST, true) };
  }
}
