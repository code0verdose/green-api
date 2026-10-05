import { useCallback } from 'react';

import type { SharedApi } from '@shared';

import type { Message } from '../../types/chat.types';
import { useSendMessageMutation } from '../mutations/send-message.mutation';

/** Re-sends a failed message in place, keeping its bubble and position. */
export function useRetryMessage(client: SharedApi.GreenApiClient) {
  const { mutate } = useSendMessageMutation(client);
  return useCallback(
    (message: Message) =>
      mutate({
        chatId: message.chatId,
        localId: message.localId,
        text: message.text,
        isRetry: true,
      }),
    [mutate],
  );
}
