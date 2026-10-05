import { GreenApiError, type GreenApiClient, type ReceivedNotification } from '@shared/api';

import { type PollerStatus, startNotificationPoller } from './notification-poller.util';

type Step = ReceivedNotification | null | GreenApiError;

/**
 * Fake long polling: each receive call takes the next scripted step;
 * once the script is over, the call hangs like a real long poll until aborted.
 */
function createFakeClient(steps: Step[], deleteSteps: Array<GreenApiError | null> = []) {
  const log: string[] = [];
  const receiveNotification = vi.fn<GreenApiClient['receiveNotification']>((_params, signal) => {
    const step = steps.shift();
    log.push('receive');
    if (step === undefined) {
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    }
    return step instanceof GreenApiError ? Promise.reject(step) : Promise.resolve(step);
  });
  const deleteNotification = vi.fn<GreenApiClient['deleteNotification']>((receiptId) => {
    log.push(`delete:${receiptId}`);
    const failure = deleteSteps.shift();
    return failure ? Promise.reject(failure) : Promise.resolve({ result: true });
  });
  return { client: { receiveNotification, deleteNotification }, log };
}

const notification = (receiptId: number): ReceivedNotification => ({
  receiptId,
  body: { typeWebhook: 'incomingMessageReceived', n: receiptId },
});

function start(steps: Step[], deleteSteps: Array<GreenApiError | null> = []) {
  const fake = createFakeClient(steps, deleteSteps);
  const statuses: PollerStatus[] = [];
  const handled: unknown[] = [];
  const onNotification = vi.fn((body: unknown) => {
    handled.push(body);
    fake.log.push(`handle:${(body as { n: number }).n}`);
  });
  const onFatalError = vi.fn();
  const onError = vi.fn();
  const poller = startNotificationPoller({
    client: fake.client,
    onNotification,
    onFatalError,
    onError,
    onStatusChange: (status) => statuses.push(status),
    random: () => 0.5, // jitter factor exactly 1.0
  });
  return { ...fake, poller, statuses, handled, onNotification, onFatalError, onError };
}

describe('startNotificationPoller', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('receives, handles and then deletes every notification, in order', async () => {
    const run = start([notification(1), notification(2)]);

    await vi.advanceTimersByTimeAsync(0);

    // Handling strictly precedes deletion: a crash in between redelivers, never loses.
    expect(run.log).toEqual([
      'receive',
      'handle:1',
      'delete:1',
      'receive',
      'handle:2',
      'delete:2',
      'receive',
    ]);
    expect(run.handled).toEqual([notification(1).body, notification(2).body]);
    run.poller.stop();
  });

  it('asks for a 20-second long poll', async () => {
    const run = start([]);

    await vi.advanceTimersByTimeAsync(0);

    expect(run.client.receiveNotification).toHaveBeenCalledWith(
      { receiveTimeoutSeconds: 20 },
      expect.any(AbortSignal),
    );
    run.poller.stop();
  });

  it('does not delete anything when the queue is empty', async () => {
    const run = start([null, null]);

    await vi.advanceTimersByTimeAsync(2000);

    expect(run.client.deleteNotification).not.toHaveBeenCalled();
    expect(run.client.receiveNotification).toHaveBeenCalledTimes(3);
    run.poller.stop();
  });

  it('waits out the rest of a second when an empty answer comes back instantly', async () => {
    // A server or proxy that does not hold the long poll must not turn it into a busy loop.
    const run = start([null, null]);

    await vi.advanceTimersByTimeAsync(999);
    expect(run.client.receiveNotification).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(run.client.receiveNotification).toHaveBeenCalledTimes(2);
    run.poller.stop();
  });

  it('waits only the rest of the second after an empty answer that took 400 ms', async () => {
    let clock = 0;
    const fake = createFakeClient([]);
    fake.client.receiveNotification.mockImplementationOnce(() => {
      clock += 400;
      return Promise.resolve(null);
    });
    const poller = startNotificationPoller({
      client: fake.client,
      onNotification: () => {},
      onFatalError: () => {},
      now: () => clock,
    });

    await vi.advanceTimersByTimeAsync(599);
    expect(fake.client.receiveNotification).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fake.client.receiveNotification).toHaveBeenCalledTimes(2);
    poller.stop();
  });

  it('does not pause after an empty answer that took the whole long poll', async () => {
    let clock = 0;
    const fake = createFakeClient([]);
    fake.client.receiveNotification.mockImplementationOnce(() => {
      clock += 20_000;
      return Promise.resolve(null);
    });
    const poller = startNotificationPoller({
      client: fake.client,
      onNotification: () => {},
      onFatalError: () => {},
      now: () => clock,
    });

    await vi.advanceTimersByTimeAsync(0);

    expect(fake.client.receiveNotification).toHaveBeenCalledTimes(2);
    poller.stop();
  });

  it('removes its abort listener after every finished pause', async () => {
    const network = () => new GreenApiError('network');
    const remove = vi.spyOn(AbortSignal.prototype, 'removeEventListener');
    const run = start([network(), network()]);

    await vi.advanceTimersByTimeAsync(3000);

    expect(remove.mock.calls.filter(([type]) => type === 'abort')).toHaveLength(2);
    run.poller.stop();
  });

  it('reports connecting, then online after the first successful receive', async () => {
    const run = start([null]);
    expect(run.statuses).toEqual(['connecting']);

    await vi.advanceTimersByTimeAsync(0);

    expect(run.statuses).toEqual(['connecting', 'online']);
    run.poller.stop();
  });

  it('still deletes a notification whose handler throws, so the queue never jams', async () => {
    const run = start([notification(1), notification(2)]);
    run.onNotification.mockImplementationOnce(() => {
      throw new Error('handler bug');
    });

    await vi.advanceTimersByTimeAsync(0);

    expect(run.log).toContain('delete:1');
    expect(run.log).toContain('delete:2');
    expect(run.onError).toHaveBeenCalledWith(new Error('handler bug'));
    run.poller.stop();
  });

  it('backs off exponentially on transient errors and resets after a success', async () => {
    const network = () => new GreenApiError('network');
    const run = start([network(), network(), network(), null, network()]);

    await vi.advanceTimersByTimeAsync(0);
    expect(run.client.receiveNotification).toHaveBeenCalledTimes(1);
    expect(run.statuses.at(-1)).toBe('reconnecting');

    await vi.advanceTimersByTimeAsync(999);
    expect(run.client.receiveNotification).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(run.client.receiveNotification).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(2000);
    expect(run.client.receiveNotification).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(4000);
    // 4th call succeeds (instant null) → online, then the 1 s minimum interval of empty polls.
    expect(run.client.receiveNotification).toHaveBeenCalledTimes(4);
    expect(run.statuses).toContain('online');

    await vi.advanceTimersByTimeAsync(1000);
    // 5th call fails again: the backoff starts over at 1 s.
    expect(run.client.receiveNotification).toHaveBeenCalledTimes(5);
    await vi.advanceTimersByTimeAsync(1000);
    expect(run.client.receiveNotification).toHaveBeenCalledTimes(6);
    run.poller.stop();
  });

  it('caps the backoff at 30 seconds', async () => {
    const run = start(Array.from({ length: 8 }, () => new GreenApiError('server')));

    // 1 + 2 + 4 + 8 + 16 + 30 + 30 seconds of waiting between the 8 failures.
    await vi.advanceTimersByTimeAsync((1 + 2 + 4 + 8 + 16 + 30) * 1000);
    expect(run.client.receiveNotification).toHaveBeenCalledTimes(7);
    await vi.advanceTimersByTimeAsync(29_999);
    expect(run.client.receiveNotification).toHaveBeenCalledTimes(7);
    await vi.advanceTimersByTimeAsync(1);
    expect(run.client.receiveNotification).toHaveBeenCalledTimes(8);
    run.poller.stop();
  });

  it.each([
    ['unauthorized', 401],
    ['forbidden', 403],
    ['webhook-configured', 400],
    ['instance-expired', 400],
    ['not-found', 404],
  ] as const)('stops for good on "%s"', async (kind, status) => {
    const error = new GreenApiError(kind, { status });
    const run = start([error]);

    await vi.advanceTimersByTimeAsync(60_000);

    expect(run.onFatalError).toHaveBeenCalledWith(error);
    expect(run.statuses.at(-1)).toBe('stopped');
    expect(run.client.receiveNotification).toHaveBeenCalledTimes(1);
  });

  it('retries after a failed delete instead of stopping', async () => {
    const run = start([notification(1), notification(1)], [new GreenApiError('server')]);

    await vi.advanceTimersByTimeAsync(0);
    expect(run.log).toEqual(['receive', 'handle:1', 'delete:1']);
    expect(run.onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'server' }));

    await vi.advanceTimersByTimeAsync(1000);
    // The same notification comes back; handlers are idempotent, so it is safe to handle again.
    expect(run.log).toEqual([
      'receive',
      'handle:1',
      'delete:1',
      'receive',
      'handle:1',
      'delete:1',
      'receive',
    ]);
    run.poller.stop();
  });

  it('stops a fatal delete error too', async () => {
    const run = start([notification(1)], [new GreenApiError('unauthorized', { status: 401 })]);

    await vi.advanceTimersByTimeAsync(0);

    expect(run.onFatalError).toHaveBeenCalled();
    expect(run.statuses.at(-1)).toBe('stopped');
  });

  it('aborts the in-flight long poll on stop and makes no further calls', async () => {
    const run = start([]);
    await vi.advanceTimersByTimeAsync(0);
    const signal = run.client.receiveNotification.mock.calls[0]?.[1];

    run.poller.stop();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(signal?.aborted).toBe(true);
    expect(run.client.receiveNotification).toHaveBeenCalledTimes(1);
    expect(run.onError).not.toHaveBeenCalled();
    expect(run.statuses).not.toContain('reconnecting');
  });

  it('stops during a backoff pause without waiting it out', async () => {
    const run = start([new GreenApiError('network')]);
    await vi.advanceTimersByTimeAsync(0);

    run.poller.stop();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(run.client.receiveNotification).toHaveBeenCalledTimes(1);
    await expect(run.poller.done).resolves.toBeUndefined();
  });
});
