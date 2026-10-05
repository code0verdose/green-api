import { act, renderHook, waitFor } from '@testing-library/react';

import { GreenApiError, type GreenApiClient } from '@shared/api';
import { FakeLockManager } from '@shared/test/fake-lock-manager';
import { incomingTextNotification } from '@shared/test/green-api.fixtures';

import { useConnectionStatusStore } from '../stores/connection-status.store';
import { useNotificationPoller } from './use-notification-poller.hook';

const hangingReceive: GreenApiClient['receiveNotification'] = (_params, signal) =>
  new Promise((_resolve, reject) => {
    signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  });

const makeClient = (
  receive: GreenApiClient['receiveNotification'] = hangingReceive,
): GreenApiClient => ({
  getStateInstance: vi.fn(),
  getSettings: vi.fn(),
  checkAccount: vi.fn(),
  sendMessage: vi.fn(),
  receiveNotification: vi.fn(receive),
  deleteNotification: vi.fn(() => Promise.resolve({ result: true })),
});

const render = (client: GreenApiClient) => {
  const onEvent = vi.fn();
  const onFatalError = vi.fn();
  const view = renderHook(() =>
    useNotificationPoller({ client, lockKey: '4100000000', onEvent, onFatalError }),
  );
  return { ...view, onEvent, onFatalError };
};

describe('useNotificationPoller', () => {
  beforeEach(() => useConnectionStatusStore.setState({ status: 'idle', restartToken: 0 }));

  it('maps queued notifications into events and acknowledges them', async () => {
    const receive = vi
      .fn<GreenApiClient['receiveNotification']>()
      .mockResolvedValueOnce({ receiptId: 7, body: incomingTextNotification })
      .mockImplementation(hangingReceive);
    const client = makeClient(receive);

    const { onEvent, unmount } = render(client);

    await waitFor(() =>
      expect(client.deleteNotification).toHaveBeenCalledWith(7, expect.anything()),
    );
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'message', chatId: '10000000', direction: 'incoming' }),
    );
    expect(useConnectionStatusStore.getState().status).toBe('online');
    unmount();
  });

  it('stops polling and resets the status on unmount', async () => {
    const client = makeClient();
    const { unmount } = render(client);
    await waitFor(() => expect(client.receiveNotification).toHaveBeenCalled());
    const signal = vi.mocked(client.receiveNotification).mock.calls[0]?.[1];

    unmount();

    expect(signal?.aborted).toBe(true);
    expect(useConnectionStatusStore.getState().status).toBe('idle');
  });

  it('reports a fatal error and can be restarted', async () => {
    const receive = vi
      .fn<GreenApiClient['receiveNotification']>()
      .mockRejectedValueOnce(new GreenApiError('webhook-configured', { status: 400 }))
      .mockImplementation(hangingReceive);
    const client = makeClient(receive);

    const { onFatalError, unmount } = render(client);

    await waitFor(() =>
      expect(onFatalError).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'webhook-configured' }),
      ),
    );
    expect(useConnectionStatusStore.getState().status).toBe('stopped');

    act(() => useConnectionStatusStore.getState().restart());

    await waitFor(() => expect(receive).toHaveBeenCalledTimes(2));
    unmount();
  });

  it('waits in standby while another tab holds the queue lock', async () => {
    const locks = new FakeLockManager().asLockManager();
    vi.stubGlobal('navigator', { ...navigator, locks });
    let releaseOtherTab!: () => void;
    void locks.request(
      'green-api-chat:poller:4100000000',
      {},
      () => new Promise<void>((resolve) => (releaseOtherTab = resolve)),
    );
    const client = makeClient();

    const { unmount } = render(client);

    await waitFor(() => expect(useConnectionStatusStore.getState().status).toBe('standby'));
    expect(client.receiveNotification).not.toHaveBeenCalled();

    releaseOtherTab();
    await waitFor(() => expect(client.receiveNotification).toHaveBeenCalled());
    unmount();
    vi.unstubAllGlobals();
  });

  it('logs recoverable failures in development and keeps polling', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const receive = vi
      .fn<GreenApiClient['receiveNotification']>()
      .mockRejectedValueOnce(new GreenApiError('network'))
      .mockImplementation(hangingReceive);
    const client = makeClient(receive);

    const { unmount } = render(client);

    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith('Notification polling hiccup', expect.any(GreenApiError)),
    );
    expect(useConnectionStatusStore.getState().status).toBe('reconnecting');
    unmount();
  });
});
