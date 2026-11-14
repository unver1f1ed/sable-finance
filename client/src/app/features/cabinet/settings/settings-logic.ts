import { AccountType } from '../../../core/models/finance';
import { PLAN_LIMITS } from '../../../core/models/plan-limits';
import { PlanCode } from '../../../core/models/public-content';
import { monthGenitive } from '../../../shared/util/format';

export const DELETE_CONFIRM_WORD = 'ВИДАЛИТИ';

export interface PlanUsage {
  accounts: number;
  budgets: number;
  goals: number;
}

export interface UsageRow {
  key: keyof PlanUsage;
  label: string;
  text: string;
  percent: number;
  tone: 'accent' | 'warning';
  unlimited: boolean;
}

const ROW_LABELS: Record<keyof PlanUsage, string> = {
  accounts: 'Рахунки',
  budgets: 'Бюджети',
  goals: 'Активні цілі',
};

export function usageText(used: number, limit: number | null): string {
  return limit === null ? 'без обмежень' : `${used} / ${limit}`;
}

export function usageRows(plan: PlanCode, usage: PlanUsage): UsageRow[] {
  const limits = PLAN_LIMITS[plan];
  return (['accounts', 'budgets', 'goals'] as const).map((key) => {
    const limit = limits[key];
    const used = usage[key];
    const percent = limit === null || limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
    return {
      key,
      label: ROW_LABELS[key],
      text: usageText(used, limit),
      percent,
      tone: limit !== null && used >= limit ? 'warning' : 'accent',
      unlimited: limit === null,
    };
  });
}

export function planSummary(plan: PlanCode, usage: PlanUsage): string {
  if (plan === 'plus') {
    return 'Ви користуєтесь тарифом Плюс: рахунки, бюджети й цілі без обмежень, експорт у CSV доступний.';
  }
  const limits = PLAN_LIMITS.start;
  return `Ви користуєтесь безкоштовним тарифом. Використано ${usage.accounts} із ${limits.accounts} рахунків, ${usage.budgets} із ${limits.budgets} бюджетів і ${usage.goals} із ${limits.goals} цілі.`;
}

export function canDeleteAccount(password: string, word: string): boolean {
  return password.length > 0 && word === DELETE_CONFIRM_WORD;
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  Card: 'Банківська картка',
  Cash: 'Готівка',
  Savings: 'Накопичувальний рахунок',
};

export function accountTypeLabel(type: AccountType): string {
  return ACCOUNT_TYPE_LABELS[type];
}

export function memberSince(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return `У Sable з ${date.getDate()} ${monthGenitive(month)} ${date.getFullYear()}`;
}
