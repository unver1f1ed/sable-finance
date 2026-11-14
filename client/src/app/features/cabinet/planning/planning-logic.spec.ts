import { GoalDto } from '../../../core/models/finance';
import {
  budgetState,
  contributionPreview,
  contributionSuggestions,
  daysLeftText,
  goalDeadlineLine,
  remainingAmount,
} from './planning-logic';

const NBSP = String.fromCharCode(160);

function goal(overrides: Partial<GoalDto> = {}): GoalDto {
  return {
    id: 'g',
    name: 'Ціль',
    targetAmount: 45000,
    currentAmount: 27000,
    deadline: '2027-02-01',
    icon: 'pin',
    color: '#6FDBD4',
    isAchieved: false,
    isArchived: false,
    monthlyNeeded: 6000,
    ...overrides,
  };
}

describe('budgetState', () => {
  it.each([
    [0, 'ok', null],
    [0.84, 'ok', null],
    [0.85, 'near', 'Майже ліміт'],
    [0.99, 'near', 'Майже ліміт'],
    [1, 'full', 'Ліміт вичерпано'],
    [1.01, 'over', 'Понад ліміт'],
  ])('ratio %s -> %s', (ratio, kind, badge) => {
    const state = budgetState(ratio * 1000, 1000);
    expect(state.kind).toBe(kind);
    expect(state.badge).toBe(badge);
  });

  it('builds the remainder texts', () => {
    expect(budgetState(7850, 9000).remainder).toBe(`Залишилось 1${NBSP}150${NBSP}₴`);
    expect(budgetState(3000, 3000).remainder).toBe(`Залишилось 0${NBSP}₴`);
    expect(budgetState(3620, 3000).remainder).toBe(`Перевищено на 620${NBSP}₴`);
  });

  it('clamps the bar but keeps the real percent', () => {
    const state = budgetState(3620, 3000);
    expect(state.barPercent).toBe(100);
    expect(state.percent).toBe(121);
    expect(state.danger).toBe(true);
  });

  it('does not divide by a zero limit', () => {
    expect(budgetState(100, 0).percent).toBe(0);
  });

  it('avoids floating point artefacts', () => {
    expect(budgetState(0.1 + 0.2, 0.3).kind).toBe('full');
  });
});

describe('daysLeftText', () => {
  it.each([
    [1, 'залишилось 1 день'],
    [2, 'залишилось 2 дні'],
    [4, 'залишилось 4 дні'],
    [5, 'залишилось 5 днів'],
    [11, 'залишилось 11 днів'],
    [21, 'залишилось 21 день'],
  ])('%i days', (days, text) => {
    expect(daysLeftText(days, false)).toBe(text);
  });

  it('describes a past month', () => {
    expect(daysLeftText(0, true)).toBe('місяць завершено');
  });
});

describe('contributionSuggestions', () => {
  it('uses the monthly amount, half and double rounded to hundreds', () => {
    expect(contributionSuggestions(6000, 18000)).toEqual([3000, 6000, 12000]);
    expect(contributionSuggestions(1250, 18000)).toEqual([600, 1250, 2500]);
  });

  it('falls back to fixed amounts without monthlyNeeded', () => {
    expect(contributionSuggestions(null, 18000)).toEqual([500, 1000, 5000]);
  });

  it('never exceeds the remaining amount and removes duplicates', () => {
    expect(contributionSuggestions(null, 800)).toEqual([500]);
    expect(contributionSuggestions(100, 150)).toEqual([100]);
    expect(contributionSuggestions(null, 50)).toEqual([]);
  });
});

describe('contributionPreview', () => {
  it('computes the result of a contribution', () => {
    expect(contributionPreview(27000, 45000, 3000)).toEqual({ after: 30000, percent: 67, remaining: 15000, achieved: false });
  });

  it('does not produce floating point artefacts', () => {
    const preview = contributionPreview(27000.1, 45000, 0.2);
    expect(preview.after).toBe(27000.3);
    expect(preview.remaining).toBe(17999.7);
  });

  it('marks the goal as achieved', () => {
    const preview = contributionPreview(44000, 45000, 1000);
    expect(preview.achieved).toBe(true);
    expect(preview.remaining).toBe(0);
    expect(remainingAmount(goal({ currentAmount: 44000 }))).toBe(1000);
  });
});

describe('goalDeadlineLine', () => {
  const today = new Date(2026, 10, 14);

  it('describes each state', () => {
    expect(goalDeadlineLine(goal(), today)).toEqual({ text: 'До 1 лютого 2027', warning: false });
    expect(goalDeadlineLine(goal({ deadline: null }), today).text).toBe('Без терміну');
    expect(goalDeadlineLine(goal({ isAchieved: true }), today).text).toBe('Досягнуто');
    expect(goalDeadlineLine(goal({ isArchived: true }), today).text).toBe('В архіві');
    expect(goalDeadlineLine(goal({ deadline: '2026-10-01' }), today)).toEqual({ text: 'Термін минув', warning: true });
  });
});
