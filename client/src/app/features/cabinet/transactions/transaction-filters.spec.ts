import { convertToParamMap } from '@angular/router';
import { currentMonth } from '../../../shared/util/date';
import {
  activeFilterCount,
  filtersFromParams,
  filtersToParams,
  patchFilters,
  toApiQuery,
} from './transaction-filters';

const TODAY = new Date(2026, 10, 11);
const ID = '0b1c2d3e-0000-4000-8000-000000000001';

function params(values: Record<string, string>) {
  return convertToParamMap(values);
}

describe('transaction filters', () => {
  it('uses defaults for an empty query', () => {
    expect(filtersFromParams(params({}), TODAY)).toEqual({
      search: '',
      type: 'all',
      accountId: null,
      categoryId: null,
      month: '2026-11',
      sort: 'date_desc',
      page: 1,
      pageSize: 10,
    });
  });

  it('round-trips a full state', () => {
    const query = {
      search: 'сільпо',
      type: 'Expense',
      accountId: ID,
      categoryId: ID,
      month: '2026-10',
      sort: 'amount_desc',
      page: '3',
      pageSize: '20',
    };
    const filters = filtersFromParams(params(query), TODAY);
    const written = filtersToParams(filters, TODAY);
    expect(written).toEqual(query);
    expect(filtersFromParams(params(written as Record<string, string>), TODAY)).toEqual(filters);
  });

  it('omits default values when writing', () => {
    const written = filtersToParams(filtersFromParams(params({}), TODAY), TODAY);
    expect(Object.values(written).every((value) => value === null)).toBe(true);
  });

  it('drops invalid values silently', () => {
    const filters = filtersFromParams(
      params({ type: 'Other', accountId: 'nope', month: '2026-13', sort: 'x', page: '-2', pageSize: '15' }),
      TODAY,
    );
    expect(filters.type).toBe('all');
    expect(filters.accountId).toBeNull();
    expect(filters.month).toBe(currentMonth(TODAY));
    expect(filters.sort).toBe('date_desc');
    expect(filters.page).toBe(1);
    expect(filters.pageSize).toBe(10);
  });

  it('resets the page when a filter changes but keeps an explicit page', () => {
    const filters = filtersFromParams(params({ page: '4' }), TODAY);
    expect(patchFilters(filters, { search: 'a' }).page).toBe(1);
    expect(patchFilters(filters, { page: 5 }).page).toBe(5);
  });

  it('builds the API query with the month range and the all-time option', () => {
    const query = toApiQuery(filtersFromParams(params({ month: '2026-12' }), TODAY));
    expect(query.from).toBe('2026-12-01');
    expect(query.to).toBe('2026-12-31');
    const all = toApiQuery(filtersFromParams(params({ month: 'all' }), TODAY));
    expect(all.from).toBeNull();
    expect(all.to).toBeNull();
  });

  it('counts the non-default filters', () => {
    expect(activeFilterCount(filtersFromParams(params({}), TODAY), TODAY)).toBe(0);
    expect(activeFilterCount(filtersFromParams(params({ search: 'a', type: 'Income', month: 'all' }), TODAY), TODAY)).toBe(3);
  });
});
