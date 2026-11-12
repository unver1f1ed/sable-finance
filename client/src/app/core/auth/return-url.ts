const DEFAULT_URL = '/app';

function hasForbiddenCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 32 || character === '\\') {
      return true;
    }
  }
  return false;
}

export function safeReturnUrl(value: string | null | undefined, fallback = DEFAULT_URL): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || hasForbiddenCharacters(value)) {
    return fallback;
  }
  return value;
}
