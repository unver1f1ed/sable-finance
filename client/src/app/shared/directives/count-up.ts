export interface CountSpec {
  value: number;
  decimals: number;
  decimalSeparator: string;
  groupSeparator: string;
  suffix: string;
  text: string;
}

const NUMBER_PATTERN = /^(\d+(?:[\s\u00a0\u202f]\d{3})*(?:[.,]\d+)?)([+%]|[\s\u00a0][^\d\s][^\d]*)?$/;

export function parseCount(text: string): CountSpec | null {
  const trimmed = text.trim();
  const match = NUMBER_PATTERN.exec(trimmed);
  if (!match) {
    return null;
  }
  const digits = match[1];
  const suffix = match[2] ?? '';
  const group = /[\s\u00a0\u202f]/.exec(digits)?.[0] ?? '';
  const decimalMatch = /([.,])(\d+)$/.exec(digits);
  const decimals = decimalMatch ? decimalMatch[2].length : 0;
  const normalized = digits.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
  return {
    value: Number(normalized),
    decimals,
    decimalSeparator: decimalMatch ? decimalMatch[1] : '.',
    groupSeparator: group,
    suffix,
    text: trimmed,
  };
}

export function formatCount(value: number, spec: CountSpec): string {
  const fixed = Math.max(0, value).toFixed(spec.decimals);
  const [whole, fraction] = fixed.split('.');
  const grouped = spec.groupSeparator ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, spec.groupSeparator) : whole;
  return `${fraction ? `${grouped}${spec.decimalSeparator}${fraction}` : grouped}${spec.suffix}`;
}

export function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, progress)), 3);
}
