import { useMutation } from '@tanstack/react-query';

import type { SharedApi } from '@shared';

import { sendTextMessage } from '../../api/send-text-message.api';
import { describeSendFailure } from '../../lib/describe-send-failure.util';
import { useChatStore } from '../stores/chat.store';

export interface SendMessageVariables {
  chatId: string;
  localId: string;
  text: string;
  /** Re-send of a failed message: reuse its bubble instead of adding a new one. */
  isRetry?: boolean;
}

/**
 * Optimistic: the bubble appears as "pending" at once, becomes "sent" with the idMessage
 * from SendMessage, or "failed" with a reason and a retry button. Errors stay in the bubble.
 */
export function useSendMessageMutation(client: SharedApi.GreenApiClient) {
  return useMutation({
    meta: { handlesErrors: true },
    mutationFn: ({ chatId, text }: SendMessageVariables) =>
      sendTextMessage(client, { chatId, text }),
    onMutate: ({ chatId, localId, text, isRetry }) => {
      const store = useChatStore.getState();
      if (isRetry) store.retryMessage({ chatId, localId });
      else store.addPendingMessage({ chatId, localId, text, timestamp: Date.now() });
    },
    onSuccess: ({ idMessage }, { chatId, localId }) =>
      useChatStore.getState().markMessageSent({ chatId, localId, idMessage }),
    onError: (error, { chatId, localId }) =>
      useChatStore
        .getState()
        .markMessageFailed({ chatId, localId, error: describeSendFailure(error) }),
  });
}
