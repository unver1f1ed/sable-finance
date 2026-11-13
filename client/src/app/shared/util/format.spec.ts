import { currentMonth, monthRange, parseIsoDate, shiftMonth, toIsoDate } from './date';
import {
  formatCompact,
  formatDate,
  formatDayHeading,
  formatMoney,
  formatMonth,
  formatPercent,
  formatPercentDelta,
  greetingFor,
  monthGenitive,
} from './format';
import { pluralize, resultsLabel } from './plural';

const NBSP = String.fromCharCode(160);
const MINUS = String.fromCharCode(0x2212);

describe('formatMoney', () => {
  it('formats whole amounts without decimals', () => {
    expect(formatMoney(46000)).toBe(`46${NBSP}000${NBSP}₴`);
    expect(formatMoney(0)).toBe(`0${NBSP}₴`);
  });

  it('shows kopecks only when present', () => {
    expect(formatMoney(84250.4)).toBe(`84${NBSP}250,40${NBSP}₴`);
    expect(formatMoney(842.5)).toBe(`842,50${NBSP}₴`);
  });

  it('uses the real minus sign and an optional plus', () => {
    expect(formatMoney(-842.5)).toBe(`${MINUS}842,50${NBSP}₴`);
    expect(formatMoney(46000, { sign: true })).toBe(`+46${NBSP}000${NBSP}₴`);
    expect(formatMoney(0, { sign: true })).toBe(`0${NBSP}₴`);
    expect(formatMoney(999999999.99)).toBe(`999${NBSP}999${NBSP}999,99${NBSP}₴`);
  });

  it('never prints NaN', () => {
    expect(formatMoney(Number.NaN)).toBe(`0${NBSP}₴`);
  });
});

describe('formatCompact', () => {
  it('shortens thousands and millions', () => {
    expect(formatCompact(60000)).toBe(`60${NBSP}тис`);
    expect(formatCompact(1_200_000)).toBe(`1,2${NBSP}млн`);
    expect(formatCompact(0)).toBe('0');
    expect(formatCompact(500)).toBe('500');
  });
});

describe('dates', () => {
  const today = new Date(2026, 10, 11);

  it('formats a day and month names', () => {
    expect(formatDate('2026-11-09')).toBe('9 листопада');
    expect(formatMonth('2026-11')).toBe('Листопад 2026');
    expect(monthGenitive('2026-11')).toBe('листопада');
  });

  it('builds day headings for today, yesterday and other days', () => {
    expect(formatDayHeading('2026-11-11', today)).toBe('Сьогодні, 11 листопада');
    expect(formatDayHeading('2026-11-10', today)).toBe('Вчора, 10 листопада');
    expect(formatDayHeading('2026-11-09', today)).toBe('9 листопада');
    expect(formatDayHeading('2025-12-31', today)).toBe('31 грудня 2025');
  });

  it('parses date-only strings as local calendar dates', () => {
    const date = parseIsoDate('2026-11-11');
    expect(date?.getDate()).toBe(11);
    expect(toIsoDate(date as Date)).toBe('2026-11-11');
    expect(parseIsoDate('2026-02-30')).toBeNull();
  });

  it('computes month ranges including December and leap-year February', () => {
    expect(monthRange('2026-12')).toEqual({ from: '2026-12-01', to: '2026-12-31' });
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(monthRange('2027-02')).toEqual({ from: '2027-02-01', to: '2027-02-28' });
    expect(monthRange('2026-13')).toBeNull();
  });

  it('shifts months across year boundaries', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(currentMonth(today)).toBe('2026-11');
  });
});

describe('formatPercent', () => {
  it('uses the real minus and grouping', () => {
    expect(formatPercent(39)).toBe('39%');
    expect(formatPercent(-12.4)).toBe(`${MINUS}12%`);
    expect(formatPercent(-2173832)).toBe(`${MINUS}2${NBSP}173${NBSP}832%`);
    expect(formatPercent(Number.NaN)).toBe('0%');
  });
});

describe('formatPercentDelta', () => {
  it('shows a dash when the previous value is zero', () => {
    expect(formatPercentDelta(100, 0)).toBe('—');
  });

  it('formats positive and negative changes', () => {
    expect(formatPercentDelta(112.4, 100)).toBe('+12,4%');
    expect(formatPercentDelta(108, 100)).toBe('+8%');
    expect(formatPercentDelta(90, 100)).toBe(`${MINUS}10%`);
    expect(formatPercentDelta(100, 100)).toBe('0%');
  });
});

describe('plural forms', () => {
  it.each([
    [1, 'запис'],
    [2, 'записи'],
    [4, 'записи'],
    [5, 'записів'],
    [11, 'записів'],
    [14, 'записів'],
    [21, 'запис'],
    [142, 'записи'],
  ])('%i -> %s', (count, word) => {
    expect(pluralize(count, 'запис', 'записи', 'записів')).toBe(word);
  });

  it('builds the result label', () => {
    expect(resultsLabel(1)).toBe('1 результат');
    expect(resultsLabel(3)).toBe('3 результати');
    expect(resultsLabel(12)).toBe('12 результатів');
  });
});

describe('greetingFor', () => {
  it.each([
    [4, 'Доброї ночі'],
    [5, 'Доброго ранку'],
    [11, 'Доброго ранку'],
    [12, 'Добрий день'],
    [17, 'Добрий день'],
    [18, 'Добрий вечір'],
    [22, 'Добрий вечір'],
    [23, 'Доброї ночі'],
    [0, 'Доброї ночі'],
  ])('%i -> %s', (hour, text) => {
    expect(greetingFor(hour)).toBe(text);
  });
});
