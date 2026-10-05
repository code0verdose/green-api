import { FakeLockManager } from '@shared/test/fake-lock-manager';

import { acquireLeadership } from './acquire-leadership.util';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function tab(name: string, locks: LockManager | undefined, log: string[]) {
  const controller = new AbortController();
  acquireLeadership(
    'queue',
    controller.signal,
    {
      onLeader: () => {
        log.push(`${name}:leader`);
        return () => log.push(`${name}:released`);
      },
      onStandby: () => log.push(`${name}:standby`),
    },
    locks,
  );
  return controller;
}

describe('acquireLeadership', () => {
  it('lets only the first tab lead and hands over when it closes', async () => {
    const locks = new FakeLockManager().asLockManager();
    const log: string[] = [];

    const first = tab('A', locks, log);
    await flush();
    tab('B', locks, log);
    await flush();
    expect(log).toEqual(['A:leader', 'B:standby']);

    first.abort();
    await flush();
    expect(log).toEqual(['A:leader', 'B:standby', 'A:released', 'B:leader']);
  });

  it('gives up waiting when the standby tab is closed', async () => {
    const locks = new FakeLockManager().asLockManager();
    const log: string[] = [];
    const errorSpy = vi.spyOn(console, 'error');

    const first = tab('A', locks, log);
    await flush();
    const second = tab('B', locks, log);
    await flush();
    second.abort();
    first.abort();
    await flush();

    expect(log).toEqual(['A:leader', 'B:standby', 'A:released']);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('does not lead when aborted before the lock was granted', async () => {
    const locks = new FakeLockManager().asLockManager();
    const log: string[] = [];

    const controller = tab('A', locks, log);
    controller.abort();
    await flush();

    expect(log).toEqual([]);
  });

  it('leads immediately in browsers without Web Locks', () => {
    const log: string[] = [];

    const controller = tab('A', undefined, log);
    controller.abort();

    expect(log).toEqual(['A:leader', 'A:released']);
  });

  it('logs unexpected lock failures', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const broken = {
      request: () => Promise.reject(new Error('SecurityError')),
    } as unknown as LockManager;

    tab('A', broken, []);
    await flush();

    expect(errorSpy).toHaveBeenCalledWith('Notification poller lock failed', expect.any(Error));
  });
});
