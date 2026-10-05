type LockCallback = (lock: Lock | null) => unknown;

/** Minimal in-memory Web Locks implementation: exclusive locks, FIFO waiters, abortable waits. */
export class FakeLockManager {
  private held = new Set<string>();
  private waiters = new Map<string, Array<() => void>>();

  request(
    name: string,
    options: { ifAvailable?: boolean; signal?: AbortSignal },
    callback: LockCallback,
  ): Promise<unknown> {
    const lock = { name, mode: 'exclusive' } as Lock;
    const run = async () => {
      this.held.add(name);
      try {
        // Browsers grant a lock asynchronously; never run the callback in the caller's tick.
        await Promise.resolve();
        return await callback(lock);
      } finally {
        this.held.delete(name);
        this.waiters.get(name)?.shift()?.();
      }
    };

    if (!this.held.has(name)) return run();
    if (options.ifAvailable) return Promise.resolve().then(() => callback(null));

    return new Promise((resolve, reject) => {
      const queue = this.waiters.get(name) ?? [];
      const start = () => void run().then(resolve, reject);
      queue.push(start);
      this.waiters.set(name, queue);
      options.signal?.addEventListener('abort', () => {
        const index = queue.indexOf(start);
        if (index !== -1) queue.splice(index, 1);
        reject(new DOMException('Aborted', 'AbortError'));
      });
    });
  }

  asLockManager(): LockManager {
    return this as unknown as LockManager;
  }
}
