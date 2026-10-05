import {
  BACKOFF_BASE_MS,
  BACKOFF_JITTER,
  BACKOFF_MAX_MS,
} from '../model/constants/poller.constant';

/**
 * Delay before retry number `attempt` (1-based): 1 s, 2 s, 4 s … capped at 30 s, ±20 % jitter.
 * `random` is injectable so tests get deterministic delays.
 */
export function computeBackoff(attempt: number, random: () => number = Math.random): number {
  const exponential = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, attempt - 1));
  const jitter = 1 - BACKOFF_JITTER + random() * 2 * BACKOFF_JITTER;
  return Math.round(exponential * jitter);
}
