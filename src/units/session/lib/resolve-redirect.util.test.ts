import { resolveRedirect } from './resolve-redirect.util';

describe('resolveRedirect', () => {
  it.each([
    ['/chats/10000000', '/chats/10000000'],
    ['/', '/'],
    ['/chats/1?x=1#y', '/chats/1?x=1#y'],
  ])('keeps the internal path %s', (input, expected) => {
    expect(resolveRedirect(input)).toBe(expected);
  });

  it.each([
    undefined,
    '',
    '//evil.com',
    'https://evil.com',
    'javascript:alert(1)',
    '/\\evil.com',
    '/ evil',
  ])('falls back to "/" for %s (open-redirect guard)', (input) => {
    expect(resolveRedirect(input)).toBe('/');
  });
});
