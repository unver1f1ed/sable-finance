import { ParamMap } from '@angular/router';
import { TransactionQuery, TransactionSort, TransactionType } from '../../../core/models/finance';
import { currentMonth, isValidMonth, monthRange } from '../../../shared/util/date';

export const PAGE_SIZES = [10, 20, 50] as const;
export const DEFAULT_SORT: TransactionSort = 'date_desc';
export const ALL_TIME = 'all';

export type TypeFilter = 'all' | TransactionType;

export interface TransactionFilters {
  search: string;
  type: TypeFilter;
  accountId: string | null;
  categoryId: string | null;
  month: string;
  sort: TransactionSort;
  page: number;
  pageSize: number;
}

const SORTS: TransactionSort[] = ['date_desc', 'date_asc', 'amount_desc', 'amount_asc'];
const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SEARCH = 120;

export function filtersFromParams(params: ParamMap, today: Date = new Date()): TransactionFilters {
  const type = params.get('type');
  const accountId = params.get('accountId');
  const categoryId = params.get('categoryId');
  const month = params.get('month');
  const sort = params.get('sort') as TransactionSort | null;
  const page = Number(params.get('page'));
  const pageSize = Number(params.get('pageSize'));
  return {
    search: (params.get('search') ?? '').trim().slice(0, MAX_SEARCH),
    type: type === 'Income' || type === 'Expense' ? type : 'all',
    accountId: accountId && ID_PATTERN.test(accountId) ? accountId : null,
    categoryId: categoryId && ID_PATTERN.test(categoryId) ? categoryId : null,
    month: month === ALL_TIME || (month && isValidMonth(month)) ? month : currentMonth(today),
    sort: sort && SORTS.includes(sort) ? sort : DEFAULT_SORT,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize) ? pageSize : PAGE_SIZES[0],
  };
}

export function filtersToParams(filters: TransactionFilters, today: Date = new Date()): Record<string, string | null> {
  return {
    search: filters.search || null,
    type: filters.type === 'all' ? null : filters.type,
    accountId: filters.accountId,
    categoryId: filters.categoryId,
    month: filters.month === currentMonth(today) ? null : filters.month,
    sort: filters.sort === DEFAULT_SORT ? null : filters.sort,
    page: filters.page > 1 ? String(filters.page) : null,
    pageSize: filters.pageSize === PAGE_SIZES[0] ? null : String(filters.pageSize),
  };
}

export function patchFilters(filters: TransactionFilters, patch: Partial<TransactionFilters>): TransactionFilters {
  return { ...filters, ...patch, page: patch.page ?? 1 };
}

export function toApiQuery(filters: TransactionFilters): TransactionQuery {
  const range = filters.month === ALL_TIME ? null : monthRange(filters.month);
  return {
    search: filters.search || null,
    type: filters.type === 'all' ? null : filters.type,
    accountId: filters.accountId,
    categoryId: filters.categoryId,
    from: range?.from ?? null,
    to: range?.to ?? null,
    sort: filters.sort,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export function activeFilterCount(filters: TransactionFilters, today: Date = new Date()): number {
  return [
    filters.search !== '',
    filters.type !== 'all',
    filters.accountId !== null,
    filters.categoryId !== null,
    filters.month !== currentMonth(today),
  ].filter(Boolean).length;
}
