export function sanitizeAmount(raw: string, allowNegative = false): string {
  let text = raw.replace(/\s/g, '').replace(/\./g, ',');
  const negative = allowNegative && text.startsWith('-');
  text = text.replace(/[^\d,]/g, '');
  const separator = text.indexOf(',');
  if (separator !== -1) {
    const integer = text.slice(0, separator);
    const fraction = text.slice(separator + 1).replace(/,/g, '').slice(0, 2);
    text = `${integer},${fraction}`;
  }
  return negative ? `-${text}` : text;
}

export function parseAmount(text: string): number | null {
  const normalized = text.replace(',', '.');
  if (!/^-?\d+(\.\d*)?$/.test(normalized) && !/^-?\.\d+$/.test(normalized)) {
    return null;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function amountToText(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value).replace('.', ',');
}
