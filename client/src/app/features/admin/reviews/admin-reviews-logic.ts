import { ParamMap } from '@angular/router';
import { AdminReviewQuery, AdminReviewStatus } from '../../../core/models/admin';

const REVIEW_PAGE_SIZES = [10, 20, 50] as const;
export const REVIEW_TEXT_MIN = 10;
export const REVIEW_TEXT_MAX = 280;

export interface ReviewFilters {
  search: string;
  status: AdminReviewStatus | null;
  rating: number | null;
  page: number;
  pageSize: number;
}

export function reviewFiltersFromParams(params: ParamMap): ReviewFilters {
  const status = params.get('status');
  const rating = Number(params.get('rating'));
  const page = Number(params.get('page'));
  const pageSize = Number(params.get('pageSize'));
  return {
    search: (params.get('search') ?? '').trim().slice(0, 120),
    status: status === 'published' || status === 'hidden' ? status : null,
    rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: (REVIEW_PAGE_SIZES as readonly number[]).includes(pageSize) ? pageSize : 10,
  };
}

export function reviewFiltersToParams(filters: ReviewFilters): Record<string, string | null> {
  return {
    search: filters.search || null,
    status: filters.status,
    rating: filters.rating === null ? null : String(filters.rating),
    page: filters.page > 1 ? String(filters.page) : null,
    pageSize: filters.pageSize === 10 ? null : String(filters.pageSize),
  };
}

export function reviewFiltersToQuery(filters: ReviewFilters): AdminReviewQuery {
  return { ...filters, search: filters.search || null };
}

export function activeReviewFilterCount(filters: ReviewFilters): number {
  return [filters.search !== '', filters.status !== null, filters.rating !== null].filter(Boolean).length;
}

export function counterText(length: number, max: number, noun: string): string {
  return `${length} / ${max} ${noun}`;
}
