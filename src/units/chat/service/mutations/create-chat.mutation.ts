import { useMutation } from '@tanstack/react-query';

import { SharedLib, type SharedApi, type SharedConfig } from '@shared';

import { findAccount } from '../../api/find-account.api';
import type { Recipient } from '../../model/validation/recipient.schema';
import { useChatStore } from '../stores/chat.store';

interface UseCreateChatMutationParams {
  client: SharedApi.GreenApiClient;
  messenger: SharedConfig.Messenger;
}

/** Pessimistic: the chat appears only once CheckAccount confirmed the account and gave a chatId. */
export function useCreateChatMutation({ client, messenger }: UseCreateChatMutationParams) {
  return useMutation({
    meta: { handlesErrors: true },
    mutationFn: async (recipient: Recipient) => {
      const account = await findAccount(client, recipient, messenger);
      return recipient.kind === 'phone'
        ? {
            chatId: account.chatId,
            title: SharedLib.formatPhone(recipient.phone),
            phone: recipient.phone,
            username: account.username,
          }
        : {
            chatId: account.chatId,
            title: recipient.username,
            phone: null,
            username: recipient.username,
          };
    },
    onSuccess: (chat) => useChatStore.getState().openChat({ ...chat, now: Date.now() }),
  });
}
