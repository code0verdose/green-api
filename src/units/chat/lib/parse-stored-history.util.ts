import {
  storedChatSchema,
  storedHistoryShapeSchema,
  storedMessageSchema,
} from '../model/validation/chats-data.schema';
import type { Chat, ChatsData, Message } from '../types/chat.types';
import { ownValue } from './own-key.util';

type StoredHistory = Pick<ChatsData, 'chats' | 'messages'>;

/**
 * Reads a history restored from localStorage record by record. A damaged chat or message is
 * dropped alone; an unreadable value yields null (treated as "no history").
 */
export function parseStoredHistory(value: unknown): StoredHistory | null {
  const shape = storedHistoryShapeSchema.safeParse(value);
  if (!shape.success) return null;

  const chats: Record<string, Chat> = {};
  const messages: Record<string, Message[]> = {};
  for (const [chatId, rawChat] of Object.entries(shape.data.chats)) {
    const chat = storedChatSchema.safeParse(rawChat);
    if (!chat.success || chat.data.id !== chatId) continue;
    chats[chatId] = chat.data;
    messages[chatId] = (ownValue(shape.data.messages, chatId) ?? []).flatMap((rawMessage) => {
      const message = storedMessageSchema.safeParse(rawMessage);
      return message.success && message.data.chatId === chatId ? [message.data] : [];
    });
  }
  return { chats, messages };
}
