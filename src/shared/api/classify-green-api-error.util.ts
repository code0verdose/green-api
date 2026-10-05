import type { GreenApiErrorKind } from './green-api.errors';

/**
 * Error texts from green-api.com/v3/docs/api/common-errors and the method pages.
 * HTTP 400 is overloaded by GREEN-API, so its meaning comes from the message text.
 */
const REASON_PATTERNS: ReadonlyArray<[RegExp, GreenApiErrorKind]> = [
  [/webhook url is set/i, 'webhook-configured'],
  [/instance (is starting|in starting process)|not authorized/i, 'instance-not-ready'],
  [/expired|instance is deleted/i, 'instance-expired'],
  [/contact info limit|rate_limit_exceeded|rate limited by messenger/i, 'contact-check-limit'],
];

export function classifyReason(reason: string): GreenApiErrorKind | null {
  return REASON_PATTERNS.find(([pattern]) => pattern.test(reason))?.[1] ?? null;
}

export function classifyHttpError(status: number, detail: string): GreenApiErrorKind {
  switch (status) {
    case 400:
      return classifyReason(detail) ?? 'bad-request';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'not-found';
    case 429:
      return 'rate-limited';
    case 466:
      return 'quota-exceeded';
    case 469:
      return 'contact-check-limit';
    default:
      return status >= 500 ? 'server' : 'unknown';
  }
}
