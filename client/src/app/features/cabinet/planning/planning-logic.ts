import { GoalDto } from '../../../core/models/finance';
import { parseIsoDate, toIsoDate } from '../../../shared/util/date';
import { formatDate, formatMoney } from '../../../shared/util/format';
import { pluralize } from '../../../shared/util/plural';

export type BudgetStateKind = 'ok' | 'near' | 'full' | 'over';

export interface BudgetState {
  kind: BudgetStateKind;
  percent: number;
  barPercent: number;
  badge: string | null;
  badgeTone: 'amber' | 'red' | null;
  remainder: string;
  danger: boolean;
}

export function toKopecks(value: number): number {
  return Math.round(value * 100);
}

export function fromKopecks(value: number): number {
  return value / 100;
}

export function budgetState(spent: number, limit: number): BudgetState {
  const spentKopecks = toKopecks(spent);
  const limitKopecks = toKopecks(limit);
  const ratio = limitKopecks > 0 ? spentKopecks / limitKopecks : 0;
  const percent = Math.round(ratio * 100);
  const barPercent = Math.min(100, ratio * 100);
  if (ratio > 1) {
    return {
      kind: 'over',
      percent,
      barPercent,
      badge: 'Понад ліміт',
      badgeTone: 'red',
      remainder: `Перевищено на ${formatMoney(fromKopecks(spentKopecks - limitKopecks))}`,
      danger: true,
    };
  }
  if (ratio === 1) {
    return { kind: 'full', percent, barPercent, badge: 'Ліміт вичерпано', badgeTone: 'amber', remainder: `Залишилось ${formatMoney(0)}`, danger: false };
  }
  const remainder = `Залишилось ${formatMoney(fromKopecks(limitKopecks - spentKopecks))}`;
  if (ratio >= 0.85) {
    return { kind: 'near', percent, barPercent, badge: 'Майже ліміт', badgeTone: 'amber', remainder, danger: false };
  }
  return { kind: 'ok', percent, barPercent, badge: null, badgeTone: null, remainder, danger: false };
}

export function daysLeftText(daysLeft: number, pastMonth: boolean): string {
  if (pastMonth) {
    return 'місяць завершено';
  }
  return `залишилось ${daysLeft} ${pluralize(daysLeft, 'день', 'дні', 'днів')}`;
}

function roundToHundreds(value: number): number {
  return Math.max(100, Math.round(value / 100) * 100);
}

export function contributionSuggestions(monthlyNeeded: number | null, remaining: number): number[] {
  const base = monthlyNeeded !== null && monthlyNeeded > 0 ? [roundToHundreds(monthlyNeeded / 2), monthlyNeeded, roundToHundreds(monthlyNeeded * 2)] : [500, 1000, 5000];
  const unique: number[] = [];
  for (const value of base) {
    if (value > 0 && value <= remaining && !unique.includes(value)) {
      unique.push(value);
    }
  }
  return unique.sort((a, b) => a - b);
}

export interface ContributionPreview {
  after: number;
  percent: number;
  remaining: number;
  achieved: boolean;
}

export function contributionPreview(current: number, target: number, amount: number): ContributionPreview {
  const afterKopecks = toKopecks(current) + toKopecks(amount);
  const targetKopecks = toKopecks(target);
  const remainingKopecks = Math.max(targetKopecks - afterKopecks, 0);
  return {
    after: fromKopecks(afterKopecks),
    percent: targetKopecks > 0 ? Math.round((afterKopecks / targetKopecks) * 100) : 0,
    remaining: fromKopecks(remainingKopecks),
    achieved: afterKopecks >= targetKopecks,
  };
}

export function remainingAmount(goal: Pick<GoalDto, 'targetAmount' | 'currentAmount'>): number {
  return fromKopecks(Math.max(toKopecks(goal.targetAmount) - toKopecks(goal.currentAmount), 0));
}

export interface DeadlineLine {
  text: string;
  warning: boolean;
}

export function goalDeadlineLine(goal: GoalDto, today: Date = new Date()): DeadlineLine {
  if (goal.isArchived) {
    return { text: 'В архіві', warning: false };
  }
  if (goal.isAchieved) {
    return { text: 'Досягнуто', warning: false };
  }
  if (!goal.deadline) {
    return { text: 'Без терміну', warning: false };
  }
  const deadline = parseIsoDate(goal.deadline);
  const passed = deadline !== null && goal.deadline < toIsoDate(today);
  if (passed) {
    return { text: 'Термін минув', warning: true };
  }
  const date = parseIsoDate(goal.deadline);
  const year = date ? date.getFullYear() : today.getFullYear();
  return { text: `До ${formatDate(goal.deadline)} ${year}`, warning: false };
}
