import { Injectable, Signal, signal } from '@angular/core';
import { FaqTopicDto, PlanComparisonDto, ReviewsDto } from '../../../core/models/public-content';
import { FAQ_TOPICS, PLAN_COMPARISON, REVIEWS } from './public-content.data';

@Injectable({ providedIn: 'root' })
export class PublicContentService {
  private readonly plansState = signal<PlanComparisonDto>(PLAN_COMPARISON);
  private readonly reviewsState = signal<ReviewsDto>(REVIEWS);
  private readonly faqState = signal<FaqTopicDto[]>(FAQ_TOPICS);

  plans(): Signal<PlanComparisonDto> {
    return this.plansState.asReadonly();
  }

  reviews(): Signal<ReviewsDto> {
    return this.reviewsState.asReadonly();
  }

  faq(): Signal<FaqTopicDto[]> {
    return this.faqState.asReadonly();
  }
}
