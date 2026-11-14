import { ParamMap } from '@angular/router';

export const FAQ_QUESTION_MIN = 5;
export const FAQ_QUESTION_MAX = 160;
export const FAQ_ANSWER_MIN = 10;
export const FAQ_ANSWER_MAX = 600;

export type SwitchDecision = 'stay' | 'switch' | 'confirm';

export function decideSwitch(dirty: boolean, currentId: string | null, targetId: string | null): SwitchDecision {
  if (currentId === targetId) {
    return 'stay';
  }
  return dirty ? 'confirm' : 'switch';
}

export interface FaqFilters {
  search: string;
  topicId: string | null;
  item: string | null;
}

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function faqFiltersFromParams(params: ParamMap): FaqFilters {
  const topicId = params.get('topicId');
  const item = params.get('item');
  return {
    search: (params.get('search') ?? '').trim().slice(0, 120),
    topicId: topicId && ID_PATTERN.test(topicId) ? topicId : null,
    item: item && ID_PATTERN.test(item) ? item : null,
  };
}

export function faqFiltersToParams(filters: FaqFilters): Record<string, string | null> {
  return { search: filters.search || null, topicId: filters.topicId, item: filters.item };
}
