import { useParams } from '@tanstack/react-router';

import { ChatService } from '@units/chat';
import { NotificationService, type NotificationTypes } from '@units/notification';
import { SessionService, type SessionTypes } from '@units/session';
import { SharedApi, SharedLib, SharedUi } from '@shared';

interface UseNotificationBridgeParams {
  session: SessionTypes.Session;
  client: SharedApi.GreenApiClient;
  onSessionExpired: () => void;
}

const POLLER_STOPPED_TOAST_ID = 'poller-stopped';

/**
 * Composition root of receiving: drains the GREEN-API queue and routes each event to the unit
 * that owns it — messages and statuses to the chat history, instance events to the session.
 */
export function useNotificationBridge({
  session,
  client,
  onSessionExpired,
}: UseNotificationBridgeParams) {
  const { receiveMessage, applyStatus } = ChatService.useChatActions();
  const { updateState, reportQuotaExceeded } = SessionService.useInstanceEvents(session.idInstance);
  const { chatId: activeChatId } = useParams({ strict: false });

  const onEvent = (event: NotificationTypes.NotificationEvent) => {
    switch (event.type) {
      case 'message':
        receiveMessage({
          ...event,
          localId: SharedLib.createLocalId(),
          isActive: event.chatId === activeChatId && document.visibilityState === 'visible',
        });
        return;
      case 'status':
        applyStatus(event);
        return;
      case 'instance-state':
        updateState(event.state);
        return;
      case 'quota-exceeded':
        reportQuotaExceeded(event.description);
        return;
      case 'ignored':
        return;
    }
  };

  const onFatalError = (error: unknown) => {
    if (SharedApi.isGreenApiError(error) && error.isAuthError) {
      SharedUi.notify.error('Ключ доступа больше не действует. Войдите заново.', {
        title: 'Сессия завершена',
      });
      onSessionExpired();
      return;
    }
    SharedUi.notify.error(SharedLib.getErrorMessage(error), {
      id: POLLER_STOPPED_TOAST_ID,
      title: 'Входящие сообщения не приходят',
    });
  };

  NotificationService.useNotificationPoller({
    client,
    lockKey: session.idInstance,
    onEvent,
    onFatalError,
  });
}
