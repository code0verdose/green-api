import { SharedApi } from '@shared';

import {
  FATAL_POLLER_ERRORS,
  MIN_EMPTY_POLL_INTERVAL_MS,
  RECEIVE_TIMEOUT_SECONDS,
} from '../model/constants/poller.constant';
import { computeBackoff } from './compute-backoff.util';

export type PollerStatus = 'connecting' | 'online' | 'reconnecting' | 'stopped';

export interface NotificationPollerOptions {
  client: Pick<SharedApi.GreenApiClient, 'receiveNotification' | 'deleteNotification'>;
  /** Must be idempotent: after a crash between handling and deleting, a notification is redelivered. */
  onNotification: (body: unknown) => void;
  /** Called once when the poller gives up; retrying would not help. */
  onFatalError: (error: unknown) => void;
  /** Every recoverable failure, for logging. */
  onError?: (error: unknown) => void;
  onStatusChange?: (status: PollerStatus) => void;
  random?: () => number;
  now?: () => number;
}

export interface NotificationPoller {
  stop: () => void;
  /** Settles when the loop has exited (after stop or a fatal error). */
  done: Promise<void>;
}

const isFatal = (error: unknown) =>
  SharedApi.isGreenApiError(error) && FATAL_POLLER_ERRORS.has(error.kind);

/** Resolves after `ms` or on abort, whichever comes first, and leaves no listener behind. */
const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });

/**
 * HTTP API receiving per the GREEN-API docs: ReceiveNotification → handle → DeleteNotification.
 * Deleting after handling gives at-least-once delivery; handlers dedupe by idMessage.
 */
export function startNotificationPoller({
  client,
  onNotification,
  onFatalError,
  onError,
  onStatusChange,
  random,
  now = Date.now,
}: NotificationPollerOptions): NotificationPoller {
  const controller = new AbortController();
  const { signal } = controller;
  let status: PollerStatus | null = null;
  let failures = 0;

  const setStatus = (next: PollerStatus) => {
    if (next === status) return;
    status = next;
    onStatusChange?.(next);
  };

  /** Returns false when the loop must end. */
  const handleFailure = async (error: unknown): Promise<boolean> => {
    if (signal.aborted || SharedApi.isAbortError(error)) return false;
    if (isFatal(error)) {
      setStatus('stopped');
      onFatalError(error);
      return false;
    }
    onError?.(error);
    setStatus('reconnecting');
    failures += 1;
    await sleep(computeBackoff(failures, random), signal);
    return !signal.aborted;
  };

  const loop = async () => {
    setStatus('connecting');
    while (!signal.aborted) {
      let notification;
      const startedAt = now();
      try {
        notification = await client.receiveNotification(
          { receiveTimeoutSeconds: RECEIVE_TIMEOUT_SECONDS },
          signal,
        );
      } catch (error) {
        if (await handleFailure(error)) continue;
        return;
      }

      if (signal.aborted) return;
      failures = 0;
      setStatus('online');
      if (!notification) {
        const elapsed = now() - startedAt;
        if (elapsed < MIN_EMPTY_POLL_INTERVAL_MS) {
          await sleep(MIN_EMPTY_POLL_INTERVAL_MS - elapsed, signal);
        }
        continue;
      }

      try {
        onNotification(notification.body);
      } catch (error) {
        // A handler bug must not block the queue: report it and still acknowledge the notification.
        onError?.(error);
      }

      try {
        await client.deleteNotification(notification.receiptId, signal);
      } catch (error) {
        if (!(await handleFailure(error))) return;
      }
    }
  };

  const done = loop();

  return { stop: () => controller.abort(), done };
}
