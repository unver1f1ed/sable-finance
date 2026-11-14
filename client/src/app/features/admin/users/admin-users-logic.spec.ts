import { convertToParamMap } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { percentText, userFiltersFromParams, userFiltersToParams, userStatHints, userStatus } from './admin-users-logic';

describe('userStatus', () => {
  it('labels blocked users first', () => {
    expect(userStatus({ isBlocked: true, transactionCount: 12 })).toEqual({ label: 'Заблоковано', tone: 'red' });
  });

  it('labels users without transactions as new', () => {
    expect(userStatus({ isBlocked: false, transactionCount: 0 }).label).toBe('Новий');
  });

  it('labels the rest as active', () => {
    expect(userStatus({ isBlocked: false, transactionCount: 3 }).label).toBe('Активний');
  });
});

describe('stat hints', () => {
  it('computes percentages from the stats', () => {
    const hints = userStatHints({ total: 1000, activeThisMonth: 730, onPlus: 248, blocked: 4 });
    expect(hints.active).toBe('73% від усіх');
    expect(hints.plus).toBe('24,8% конверсія');
  });

  it('returns no hints and no NaN for zero users', () => {
    const hints = userStatHints({ total: 0, activeThisMonth: 0, onPlus: 0, blocked: 0 });
    expect(hints).toEqual({ active: null, plus: null });
    expect(percentText(0, 0)).toBeNull();
  });
});

describe('user filters', () => {
  it('reads valid params and ignores invalid ones', () => {
    const filters = userFiltersFromParams(
      convertToParamMap({ search: ' Марта ', role: 'Admin', status: 'bogus', sort: 'name_asc', page: '3', pageSize: '7' }),
    );
    expect(filters).toMatchObject({ search: 'Марта', role: 'Admin', status: null, sort: 'name_asc', page: 3, pageSize: 20 });
  });

  it('omits defaults when writing params', () => {
    const params = userFiltersToParams(userFiltersFromParams(convertToParamMap({})));
    expect(Object.values(params).every((value) => value === null)).toBe(true);
  });
});
