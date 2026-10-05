import { classifyReason } from './classify-green-api-error.util';
import { GreenApiError, isAbortError, isGreenApiError } from './green-api.errors';
import { readErrorDetail } from './read-error-detail.util';

describe('GreenApiError', () => {
  it.each([
    ['unauthorized', true, false],
    ['forbidden', true, false],
    ['network', false, true],
    ['instance-not-ready', false, true],
    ['bad-request', false, false],
  ] as const)('"%s": auth error %s, retryable %s', (kind, isAuth, isRetryable) => {
    const error = new GreenApiError(kind);
    expect(error.isAuthError).toBe(isAuth);
    expect(error.isRetryable).toBe(isRetryable);
  });

  it('mentions the HTTP status but never the request', () => {
    expect(new GreenApiError('server', { status: 502 }).message).toBe(
      'GREEN-API request failed: server (HTTP 502)',
    );
    expect(new GreenApiError('network').message).toBe('GREEN-API request failed: network');
  });

  it('recognises its own errors and aborts of any origin', () => {
    expect(isGreenApiError(new GreenApiError('unknown'))).toBe(true);
    expect(isGreenApiError(new Error('x'))).toBe(false);
    expect(isAbortError(new DOMException('x', 'AbortError'))).toBe(true);
    expect(isAbortError({ name: 'AbortError' })).toBe(true);
    expect(isAbortError(new Error('x'))).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });

  it('classifies only known reasons', () => {
    expect(classifyReason('Instance is deleted')).toBe('instance-expired');
    expect(classifyReason('something else')).toBeNull();
  });
});

describe('readErrorDetail', () => {
  it.each([
    ['{"message":"Unauthorized"}', 'Unauthorized'],
    ['{"reason":"limit"}', 'limit'],
    ['{"error":"bad"}', 'bad'],
    ['"plain json string"', 'plain json string'],
    ['{"other":1}', '{"other":1}'],
    ['[1,2]', '[1,2]'],
    ['null', 'null'],
    ['not json at all', 'not json at all'],
  ])('reads %s', (body, expected) => {
    expect(readErrorDetail(body, 'secret')).toBe(expected);
  });

  it('removes the token and trims long bodies', () => {
    expect(readErrorDetail('bad url /waInstance1/x/secret-token here', 'secret-token')).toBe(
      'bad url /waInstance1/x/*** here',
    );
    expect(readErrorDetail('x'.repeat(500), '')).toHaveLength(300);
  });
});
