const NON_BREAKING_SPACE = String.fromCharCode(160);

export function formatPrice(value: number): string {
  return `${value}${NON_BREAKING_SPACE}₴`;
}
