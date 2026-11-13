import { parseIsoDate, toIsoDate } from './date';

const NON_BREAKING_SPACE = String.fromCharCode(160);
const MINUS = String.fromCharCode(0x2212);

const MONTHS_NOMINATIVE = [
  'Січень',
  'Лютий',
  'Березень',
  'Квітень',
  'Травень',
  'Червень',
  'Липень',
  'Серпень',
  'Вересень',
  'Жовтень',
  'Листопад',
  'Грудень',
];
const MONTHS_GENITIVE = [
  'січня',
  'лютого',
  'березня',
  'квітня',
  'травня',
  'червня',
  'липня',
  'серпня',
  'вересня',
  'жовтня',
  'листопада',
  'грудня',
];
const MONTHS_SHORT = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру'];

const WHOLE_FORMAT = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0, useGrouping: true });
const KOPECK_FORMAT = new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true });

function normalizeSpaces(value: string): string {
  return value.replace(/\s/g, NON_BREAKING_SPACE);
}

function monthIndex(month: string): number {
  return Number(month.slice(5, 7)) - 1;
}

export function formatPrice(value: number): string {
  return `${value}${NON_BREAKING_SPACE}₴`;
}

export function formatMoney(value: number, options: { sign?: boolean } = {}): string {
  const safe = Number.isFinite(value) ? value : 0;
  const cents = Math.round(Math.abs(safe) * 100);
  const hasKopecks = cents % 100 !== 0;
  const amount = cents / 100;
  const text = normalizeSpaces((hasKopecks ? KOPECK_FORMAT : WHOLE_FORMAT).format(amount));
  let sign = '';
  if (cents !== 0) {
    if (safe < 0) {
      sign = MINUS;
    } else if (options.sign) {
      sign = '+';
    }
  }
  return `${sign}${text}${NON_BREAKING_SPACE}₴`;
}

export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? MINUS : '';
  const trim = (number: number): string => String(Math.round(number * 10) / 10).replace('.', ',');
  if (abs >= 1_000_000) {
    return `${sign}${trim(abs / 1_000_000)}${NON_BREAKING_SPACE}млн`;
  }
  if (abs >= 1000) {
    return `${sign}${trim(abs / 1000)}${NON_BREAKING_SPACE}тис`;
  }
  return `${sign}${Math.round(abs)}`;
}

export function formatDate(iso: string): string {
  const date = parseIsoDate(iso);
  return date ? `${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]}` : '';
}

export function formatDayHeading(iso: string, today: Date = new Date()): string {
  const date = parseIsoDate(iso);
  if (!date) {
    return '';
  }
  const todayIso = toIsoDate(today);
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const base = formatDate(iso);
  if (iso === todayIso) {
    return `Сьогодні, ${base}`;
  }
  if (iso === toIsoDate(yesterday)) {
    return `Вчора, ${base}`;
  }
  return date.getFullYear() === today.getFullYear() ? base : `${base} ${date.getFullYear()}`;
}

export function formatMonth(month: string): string {
  return `${MONTHS_NOMINATIVE[monthIndex(month)] ?? ''} ${month.slice(0, 4)}`.trim();
}

export function monthGenitive(month: string): string {
  return MONTHS_GENITIVE[monthIndex(month)] ?? '';
}

export function monthShort(month: string): string {
  return MONTHS_SHORT[monthIndex(month)] ?? '';
}

export function formatPercentDelta(current: number, previous: number): string {
  if (!previous) {
    return '—';
  }
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(delta * 10) / 10;
  const text = String(Math.abs(rounded)).replace('.', ',');
  if (rounded === 0) {
    return '0%';
  }
  return `${rounded > 0 ? '+' : MINUS}${text}%`;
}

export function formatPointsDelta(current: number, previous: number): string {
  const delta = Math.round(current - previous);
  if (delta === 0) {
    return `0${NON_BREAKING_SPACE}п.п.`;
  }
  return `${delta > 0 ? '+' : MINUS}${Math.abs(delta)}${NON_BREAKING_SPACE}п.п.`;
}
