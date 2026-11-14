import { FormControl, FormGroup } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { buildFeatureValue, canMove, discountPercent, moveId, yearlyNotAboveMonthly } from './admin-plans-logic';

describe('discountPercent', () => {
  it('computes the yearly discount', () => {
    expect(discountPercent(129, 103)).toBe(20);
    expect(discountPercent(100, 100)).toBe(0);
  });

  it('is zero for a free plan or missing values', () => {
    expect(discountPercent(0, 0)).toBe(0);
    expect(discountPercent(null, 10)).toBe(0);
    expect(discountPercent(100, null)).toBe(0);
  });

  it('never goes below zero when the yearly price is higher', () => {
    expect(discountPercent(100, 120)).toBe(0);
  });
});

describe('yearlyNotAboveMonthly', () => {
  const group = (monthly: number | null, yearly: number | null): FormGroup =>
    new FormGroup({ priceMonthly: new FormControl(monthly), priceYearlyPerMonth: new FormControl(yearly) });

  it('rejects a yearly price above the monthly one', () => {
    expect(yearlyNotAboveMonthly(group(100, 101))).toEqual({ yearlyAboveMonthly: true });
  });

  it('accepts equal and lower prices', () => {
    expect(yearlyNotAboveMonthly(group(100, 100))).toBeNull();
    expect(yearlyNotAboveMonthly(group(100, 80))).toBeNull();
  });
});

describe('feature reordering', () => {
  const ids = ['a', 'b', 'c'];

  it('moves an item up and down', () => {
    expect(moveId(ids, 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moveId(ids, 'b', 1)).toEqual(['a', 'c', 'b']);
  });

  it('keeps the order at the ends and does not mutate the input', () => {
    expect(moveId(ids, 'a', -1)).toEqual(ids);
    expect(moveId(ids, 'c', 1)).toEqual(ids);
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('reports which moves are possible', () => {
    expect(canMove(ids, 'a', -1)).toBe(false);
    expect(canMove(ids, 'a', 1)).toBe(true);
    expect(canMove(ids, 'c', 1)).toBe(false);
    expect(canMove(ids, 'x', 1)).toBe(false);
  });
});

describe('buildFeatureValue', () => {
  it('keeps text only for the Text kind', () => {
    expect(buildFeatureValue('Text', ' До 2 ')).toEqual({ kind: 'Text', text: 'До 2' });
    expect(buildFeatureValue('Included', 'ignored')).toEqual({ kind: 'Included', text: null });
  });
});
