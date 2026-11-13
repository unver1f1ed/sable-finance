const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_MONTH = /^(\d{4})-(\d{2})$/;

export function parseIsoDate(iso: string): Date | null {
  const match = ISO_DATE.exec(iso);
  if (!match) {
    return null;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

export function toIsoDate(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isValidMonth(value: string): boolean {
  const match = ISO_MONTH.exec(value);
  return !!match && Number(match[2]) >= 1 && Number(match[2]) <= 12;
}

export function currentMonth(today: Date = new Date()): string {
  return toIsoDate(today).slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const match = ISO_MONTH.exec(month);
  if (!match) {
    return month;
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1 + delta, 1);
  return toIsoDate(date).slice(0, 7);
}

export function monthRange(month: string): { from: string; to: string } | null {
  const match = ISO_MONTH.exec(month);
  if (!match || !isValidMonth(month)) {
    return null;
  }
  const year = Number(match[1]);
  const index = Number(match[2]) - 1;
  const last = new Date(year, index + 1, 0).getDate();
  return { from: `${match[1]}-${match[2]}-01`, to: `${match[1]}-${match[2]}-${String(last).padStart(2, '0')}` };
}
