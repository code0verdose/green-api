import { SharedApi } from '@shared';

interface LeadershipCallbacks {
  /** This tab now owns the lock. Return a cleanup that runs when leadership ends. */
  onLeader: () => () => void;
  /** Another tab owns the lock; this tab waits in line. */
  onStandby: () => void;
}

/**
 * Elects one tab per lock name with the Web Locks API. The lock is released when `signal`
 * aborts or the tab closes, and the next waiting tab takes over automatically.
 * Without Web Locks support every tab simply leads — a degradation, not a failure.
 */
export function acquireLeadership(
  lockName: string,
  signal: AbortSignal,
  { onLeader, onStandby }: LeadershipCallbacks,
  locks: LockManager | undefined = globalThis.navigator?.locks,
): void {
  const hold = () =>
    new Promise<void>((resolve) => {
      const release = onLeader();
      const finish = () => {
        release();
        resolve();
      };
      if (signal.aborted) finish();
      else signal.addEventListener('abort', finish, { once: true });
    });

  if (!locks) {
    void hold();
    return;
  }

  const reportUnexpected = (error: unknown) => {
    if (!SharedApi.isAbortError(error)) console.error('Notification poller lock failed', error);
  };

  // `ifAvailable` tells "free right now" from "held by another tab" without a standby flicker.
  locks
    .request(lockName, { ifAvailable: true }, async (lock) => {
      if (signal.aborted) return;
      if (lock) return hold();
      onStandby();
      await locks.request(lockName, { signal }, hold).catch(reportUnexpected);
    })
    .catch(reportUnexpected);
}
