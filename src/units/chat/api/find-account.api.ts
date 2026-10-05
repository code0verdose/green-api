import type { SharedApi, SharedConfig } from '@shared';

import {
  NO_ACCOUNT_BY_PHONE,
  NO_ACCOUNT_BY_USERNAME,
} from '../model/constants/chat-texts.constant';
import type { Recipient } from '../model/validation/recipient.schema';

export interface FoundAccount {
  chatId: string;
  username: string | null;
}

/**
 * Resolves a phone or @username into the messenger's chatId with CheckAccount.
 * Replies come with this chatId, so a chat keyed by it matches incoming notifications.
 */
export async function findAccount(
  client: SharedApi.GreenApiClient,
  recipient: Recipient,
  messenger: SharedConfig.Messenger,
  signal?: AbortSignal,
): Promise<FoundAccount> {
  const target =
    recipient.kind === 'phone'
      ? { phoneNumber: Number(recipient.phone) }
      : { username: recipient.username };
  const result = await client.checkAccount(target, signal);

  if (!result.exist || !result.chatId) {
    throw new Error(
      recipient.kind === 'phone'
        ? NO_ACCOUNT_BY_PHONE[messenger]
        : NO_ACCOUNT_BY_USERNAME(recipient.username),
    );
  }
  return { chatId: result.chatId, username: result.username };
}
