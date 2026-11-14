import { AbstractControl, ValidationErrors } from '@angular/forms';
import { FeatureValue } from '../../../core/models/admin';
import { FeatureKind } from '../../../core/models/public-content';

export const FEATURE_TEXT_MAX = 40;

export function discountPercent(monthly: number | null, yearlyPerMonth: number | null): number {
  if (monthly === null || yearlyPerMonth === null || !Number.isFinite(monthly) || !Number.isFinite(yearlyPerMonth) || monthly <= 0) {
    return 0;
  }
  const value = Math.round((1 - yearlyPerMonth / monthly) * 100);
  return Math.min(100, Math.max(0, value));
}

export function yearlyNotAboveMonthly(group: AbstractControl): ValidationErrors | null {
  const monthly = group.get('priceMonthly')?.value as number | null | undefined;
  const yearly = group.get('priceYearlyPerMonth')?.value as number | null | undefined;
  return monthly != null && yearly != null && yearly > monthly ? { yearlyAboveMonthly: true } : null;
}

export function moveId(ids: string[], id: string, direction: -1 | 1): string[] {
  const index = ids.indexOf(id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= ids.length) {
    return ids;
  }
  const next = [...ids];
  next[index] = ids[target];
  next[target] = id;
  return next;
}

export function canMove(ids: string[], id: string, direction: -1 | 1): boolean {
  const index = ids.indexOf(id);
  const target = index + direction;
  return index !== -1 && target >= 0 && target < ids.length;
}

export function featureValueFor(values: Record<string, FeatureValue>, code: string): FeatureValue {
  return values[code] ?? { kind: 'NotIncluded', text: null };
}

export function buildFeatureValue(kind: FeatureKind, text: string): FeatureValue {
  return kind === 'Text' ? { kind, text: text.trim() } : { kind, text: null };
}
