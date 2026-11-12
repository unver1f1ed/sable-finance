import { safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it('accepts an internal path with query and fragment', () => {
    expect(safeReturnUrl('/app/planning')).toBe('/app/planning');
    expect(safeReturnUrl('/app/transactions?page=2#top')).toBe('/app/transactions?page=2#top');
  });

  it.each(['//evil.example', 'https://evil.example', 'javascript:alert(1)', '/\\evil.example', '/app\nfoo', '', null, undefined])(
    'rejects %s',
    (value) => {
      expect(safeReturnUrl(value)).toBe('/app');
    },
  );
});
