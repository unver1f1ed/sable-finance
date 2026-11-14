import { ParamMap } from '@angular/router';
import { AdminUserDto, AdminUserQuery, AdminUserSort, AdminUserStats, AdminUserStatus } from '../../../core/models/admin';
import { PlanCode } from '../../../core/models/public-content';
import { Role } from '../../../core/models/auth';
import { BadgeTone } from '../../../shared/ui/badge/badge.component';

export const USER_PAGE_SIZES = [10, 20, 50] as const;
export const DEFAULT_USER_SORT: AdminUserSort = 'created_desc';

const SORTS: AdminUserSort[] = ['created_desc', 'created_asc', 'name_asc'];
const PERCENT_FORMAT = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 1 });

export interface UserStatus {
  label: string;
  tone: BadgeTone;
}

export function userStatus(user: Pick<AdminUserDto, 'isBlocked' | 'transactionCount'>): UserStatus {
  if (user.isBlocked) {
    return { label: 'Заблоковано', tone: 'red' };
  }
  return user.transactionCount === 0 ? { label: 'Новий', tone: 'grey' } : { label: 'Активний', tone: 'teal' };
}

export function percentText(part: number, total: number): string | null {
  if (total <= 0 || !Number.isFinite(part)) {
    return null;
  }
  return `${PERCENT_FORMAT.format(Math.round((part / total) * 1000) / 10)}%`;
}

export interface UserStatHints {
  active: string | null;
  plus: string | null;
}

export function userStatHints(stats: AdminUserStats): UserStatHints {
  const plus = percentText(stats.onPlus, stats.total);
  return {
    active: stats.total > 0 ? `${Math.round((stats.activeThisMonth / stats.total) * 100)}% від усіх` : null,
    plus: plus ? `${plus} конверсія` : null,
  };
}

export interface UserFilters {
  search: string;
  role: Role | null;
  planCode: PlanCode | null;
  status: AdminUserStatus | null;
  sort: AdminUserSort;
  page: number;
  pageSize: number;
}

export function userFiltersFromParams(params: ParamMap): UserFilters {
  const role = params.get('role');
  const planCode = params.get('planCode');
  const status = params.get('status');
  const sort = params.get('sort') as AdminUserSort | null;
  const page = Number(params.get('page'));
  const pageSize = Number(params.get('pageSize'));
  return {
    search: (params.get('search') ?? '').trim().slice(0, 120),
    role: role === 'Admin' || role === 'User' ? role : null,
    planCode: planCode && /^[a-z0-9_-]{1,20}$/.test(planCode) ? (planCode as PlanCode) : null,
    status: status === 'active' || status === 'blocked' ? status : null,
    sort: sort && SORTS.includes(sort) ? sort : DEFAULT_USER_SORT,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: (USER_PAGE_SIZES as readonly number[]).includes(pageSize) ? pageSize : 20,
  };
}

export function userFiltersToParams(filters: UserFilters): Record<string, string | null> {
  return {
    search: filters.search || null,
    role: filters.role,
    planCode: filters.planCode,
    status: filters.status,
    sort: filters.sort === DEFAULT_USER_SORT ? null : filters.sort,
    page: filters.page > 1 ? String(filters.page) : null,
    pageSize: filters.pageSize === 20 ? null : String(filters.pageSize),
  };
}

export function userFiltersToQuery(filters: UserFilters): AdminUserQuery {
  return { ...filters, search: filters.search || null };
}

export function activeUserFilterCount(filters: UserFilters): number {
  return [filters.search !== '', filters.role !== null, filters.planCode !== null, filters.status !== null].filter(Boolean).length;
}
