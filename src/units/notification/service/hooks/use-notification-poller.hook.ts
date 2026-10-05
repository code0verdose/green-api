import { useEffect, useEffectEvent } from 'react';

import type { SharedApi } from '@shared';

import { acquireLeadership } from '../../lib/acquire-leadership.util';
import { mapNotification } from '../../lib/map-notification.util';
import { startNotificationPoller } from '../../lib/notification-poller.util';
import { POLLER_LOCK_PREFIX } from '../../model/constants/poller.constant';
import type { NotificationEvent } from '../../types/notification.types';
import { useConnectionStatusStore } from '../stores/connection-status.store';

interface UseNotificationPollerParams {
  client: SharedApi.GreenApiClient;
  /** Usually idInstance: tabs of the same instance share one queue and one lock. */
  lockKey: string;
  onEvent: (event: NotificationEvent) => void;
  onFatalError: (error: unknown) => void;
}

/** Errors carry no URL, so logging them in production cannot leak the token. */
const logRecoverableError = (error: unknown) => {
  console.warn('Notification polling hiccup', error);
};

/** Drains the instance's notification queue while the component is mounted. */
export function useNotificationPoller({
  client,
  lockKey,
  onEvent,
  onFatalError,
}: UseNotificationPollerParams) {
  const restartToken = useConnectionStatusStore((state) => state.restartToken);
  const handleBody = useEffectEvent((body: unknown) => onEvent(mapNotification(body)));
  const handleFatalError = useEffectEvent((error: unknown) => onFatalError(error));

  // Legitimate effect: subscribes the tab to an external long-lived process (the API queue)
  // and tears it down on unmount, logout or instance change.
  useEffect(() => {
    const { setStatus } = useConnectionStatusStore.getState();
    const controller = new AbortController();

    acquireLeadership(`${POLLER_LOCK_PREFIX}${lockKey}`, controller.signal, {
      onStandby: () => setStatus('standby'),
      onLeader: () => {
        const poller = startNotificationPoller({
          client,
          onNotification: (body) => handleBody(body),
          onFatalError: (error) => handleFatalError(error),
          onError: logRecoverableError,
          onStatusChange: setStatus,
        });
        return () => poller.stop();
      },
    });

    return () => {
      controller.abort();
      setStatus('idle');
    };
  }, [client, lockKey, restartToken]);
}
