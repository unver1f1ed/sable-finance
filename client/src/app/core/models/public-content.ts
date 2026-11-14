export type PlanCode = 'start' | 'plus';
export type FeatureKind = 'Included' | 'NotIncluded' | 'Text';

export interface PlanDto {
  code: PlanCode;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearlyPerMonth: number;
  isPopular: boolean;
}

export interface PlanFeatureValueDto {
  kind: FeatureKind;
  text: string | null;
}

interface PlanFeatureDto {
  id: string;
  name: string;
  values: Record<string, PlanFeatureValueDto>;
}

export interface PlanComparisonDto {
  plans: PlanDto[];
  features: PlanFeatureDto[];
}

export interface ReviewDto {
  id: string;
  author: string;
  text: string;
  rating: number;
}

export interface ReviewsDto {
  average: number;
  items: ReviewDto[];
}

interface FaqItemDto {
  id: string;
  question: string;
  answer: string;
}

export interface FaqTopicDto {
  id: string;
  name: string;
  items: FaqItemDto[];
}
