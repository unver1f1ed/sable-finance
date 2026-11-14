import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, Signal, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { PublicContentApiService } from '../../../core/api/public-content-api.service';
import { FaqTopicDto, PlanComparisonDto, ReviewsDto } from '../../../core/models/public-content';
import { FAQ_TOPICS, PLAN_COMPARISON, REVIEWS } from './public-content.data';

export type PublicResource = 'plans' | 'reviews' | 'faq';

@Injectable({ providedIn: 'root' })
export class PublicContentService {
  private readonly api = inject(PublicContentApiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly plansState = signal<PlanComparisonDto>(PLAN_COMPARISON);
  private readonly reviewsState = signal<ReviewsDto>(REVIEWS);
  private readonly faqState = signal<FaqTopicDto[]>(FAQ_TOPICS);
  private readonly requested = new Set<PublicResource>();
  private readonly stale = new Set<PublicResource>();

  plans(): Signal<PlanComparisonDto> {
    this.ensure('plans', (fresh) => this.api.plans(fresh), (value) => this.plansState.set(value));
    return this.plansState.asReadonly();
  }

  reviews(): Signal<ReviewsDto> {
    this.ensure('reviews', (fresh) => this.api.reviews(fresh), (value) => this.reviewsState.set(value));
    return this.reviewsState.asReadonly();
  }

  faq(): Signal<FaqTopicDto[]> {
    this.ensure('faq', (fresh) => this.api.faq(fresh), (value) => this.faqState.set(value));
    return this.faqState.asReadonly();
  }

  invalidate(resource: PublicResource): void {
    this.requested.delete(resource);
    this.stale.add(resource);
  }

  private ensure<T>(resource: PublicResource, request: (fresh: boolean) => Observable<T>, apply: (value: T) => void): void {
    if (!this.isBrowser || this.requested.has(resource)) {
      return;
    }
    this.requested.add(resource);
    const fresh = this.stale.delete(resource);
    request(fresh).subscribe({
      next: apply,
      error: () => undefined,
    });
  }
}
