import type { SharedApi } from '@shared';

/** Docs allow 5–60 s. 20 s keeps the request count low while staying under typical proxy timeouts. */
export const RECEIVE_TIMEOUT_SECONDS = 20;

/**
 * An empty answer faster than this means the server did not hold the long poll (a proxy, a
 * misconfiguration): wait the rest of it instead of spinning at network speed.
 */
export const MIN_EMPTY_POLL_INTERVAL_MS = 1_000;

export const BACKOFF_BASE_MS = 1_000;
export const BACKOFF_MAX_MS = 30_000;
/** ±20 % jitter so several clients do not retry in lockstep after an outage. */
export const BACKOFF_JITTER = 0.2;

/** Errors that a retry cannot fix: the poller stops and the UI explains what to do. */
export const FATAL_POLLER_ERRORS: ReadonlySet<SharedApi.GreenApiErrorKind> = new Set([
  'unauthorized',
  'forbidden',
  'webhook-configured',
  'instance-expired',
  'not-found',
]);

/** One Web Lock per instance: only one tab may drain a notification queue. */
export const POLLER_LOCK_PREFIX = 'green-api-chat:poller:';
