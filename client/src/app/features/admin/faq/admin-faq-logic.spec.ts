import { convertToParamMap } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { decideSwitch, faqFiltersFromParams, faqFiltersToParams } from './admin-faq-logic';

describe('decideSwitch', () => {
  it('stays when the target is already selected', () => {
    expect(decideSwitch(true, 'a', 'a')).toBe('stay');
  });

  it('asks for confirmation when the form has unsaved changes', () => {
    expect(decideSwitch(true, 'a', 'b')).toBe('confirm');
    expect(decideSwitch(true, null, 'b')).toBe('confirm');
  });

  it('switches at once when nothing was changed', () => {
    expect(decideSwitch(false, 'a', 'b')).toBe('switch');
  });
});

describe('faq filters', () => {
  const id = '01a1cfd3-2262-79e4-9a53-6f7a043eb44a';

  it('keeps valid ids and drops invalid ones', () => {
    const filters = faqFiltersFromParams(convertToParamMap({ topicId: id, item: 'nope', search: ' пароль ' }));
    expect(filters).toEqual({ search: 'пароль', topicId: id, item: null });
  });

  it('writes empty values as null', () => {
    expect(faqFiltersToParams({ search: '', topicId: null, item: null })).toEqual({ search: null, topicId: null, item: null });
  });
});
