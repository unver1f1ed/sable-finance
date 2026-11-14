import { describe, expect, it } from 'vitest';
import { DELETE_CONFIRM_WORD, accountTypeLabel, canDeleteAccount, memberSince, planSummary, usageRows, usageText } from './settings-logic';

describe('plan usage', () => {
  it('formats used and limit for the start plan', () => {
    expect(usageText(2, 2)).toBe('2 / 2');
    expect(usageText(0, 5)).toBe('0 / 5');
  });

  it('shows no limit for the plus plan', () => {
    expect(usageText(12, null)).toBe('без обмежень');
  });

  it('builds rows for the start plan with a warning at the limit', () => {
    const rows = usageRows('start', { accounts: 2, budgets: 3, goals: 1 });
    expect(rows.map((row) => row.text)).toEqual(['2 / 2', '3 / 5', '1 / 1']);
    expect(rows.map((row) => row.percent)).toEqual([100, 60, 100]);
    expect(rows.map((row) => row.tone)).toEqual(['warning', 'accent', 'warning']);
  });

  it('builds unlimited rows for the plus plan', () => {
    const rows = usageRows('plus', { accounts: 7, budgets: 9, goals: 4 });
    expect(rows.every((row) => row.text === 'без обмежень' && row.unlimited && row.percent === 0 && row.tone === 'accent')).toBe(true);
  });

  it('describes usage in the summary', () => {
    expect(planSummary('start', { accounts: 2, budgets: 5, goals: 1 })).toBe(
      'Ви користуєтесь безкоштовним тарифом. Використано 2 із 2 рахунків, 5 із 5 бюджетів і 1 із 1 цілі.',
    );
    expect(planSummary('plus', { accounts: 9, budgets: 9, goals: 9 })).toContain('без обмежень');
  });
});

describe('delete account confirmation', () => {
  it('requires both the password and the exact word', () => {
    expect(canDeleteAccount('', DELETE_CONFIRM_WORD)).toBe(false);
    expect(canDeleteAccount('secret1', '')).toBe(false);
    expect(canDeleteAccount('secret1', 'видалити')).toBe(false);
    expect(canDeleteAccount('secret1', 'ВИДАЛИТИ ')).toBe(false);
    expect(canDeleteAccount('secret1', 'ВИДАЛИТИ')).toBe(true);
  });
});

describe('labels', () => {
  it('maps account types', () => {
    expect(accountTypeLabel('Card')).toBe('Банківська картка');
    expect(accountTypeLabel('Cash')).toBe('Готівка');
    expect(accountTypeLabel('Savings')).toBe('Накопичувальний рахунок');
  });

  it('writes the registration date in Ukrainian', () => {
    expect(memberSince('2026-09-03T10:00:00Z')).toBe('У Sable з 3 вересня 2026');
    expect(memberSince('not a date')).toBe('');
  });
});
