import { SharedLib } from '@shared';

import {
  AMBIGUOUS_ECHO_WINDOW_MS,
  MAX_MESSAGES_PER_CHAT,
} from '../model/constants/chat-store.constant';
import type {
  Chat,
  ChatsData,
  Message,
  MessageStatus,
  OpenChatInput,
  PendingMessageInput,
  ReceivedMessageInput,
  StatusUpdateInput,
} from '../types/chat.types';
import { ownValue } from './own-key.util';
import { reviseMessage } from './revise-message.util';

/**
 * Pure state transitions of the chat history. Each returns the same object when nothing
 * changes, so zustand subscribers do not re-render for no-ops.
 */

export const EMPTY_CHATS: ChatsData = { owner: null, chats: {}, messages: {} };

const STATUS_RANK: Record<Exclude<MessageStatus, 'failed'>, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
};

/** Statuses only move forward; `failed` cannot override proof of delivery. */
function mergeStatus(current: MessageStatus | null, next: MessageStatus): MessageStatus {
  if (current === null) return next;
  if (next === 'failed') return current === 'delivered' || current === 'read' ? current : 'failed';
  if (current === 'failed') return next;
  return STATUS_RANK[next] > STATUS_RANK[current] ? next : current;
}

/**
 * Appends in arrival order and trims the oldest beyond the cap. Timestamps are not used for
 * ordering: optimistic messages carry the browser clock (ms), notifications the server clock
 * (whole seconds), so sorting would let a reply jump above its question. The GREEN-API queue
 * is FIFO, which makes arrival order the chronological one.
 */
function appendMessage(messages: Message[], message: Message): Message[] {
  const next = [...messages, message];
  return next.length > MAX_MESSAGES_PER_CHAT ? next.slice(-MAX_MESSAGES_PER_CHAT) : next;
}

function patchChat(data: ChatsData, chatId: string, patch: (chat: Chat) => Chat): ChatsData {
  const chat = ownValue(data.chats, chatId);
  return chat ? { ...data, chats: { ...data.chats, [chatId]: patch(chat) } } : data;
}

function updateMessage(
  data: ChatsData,
  chatId: string,
  match: (message: Message) => boolean,
  update: (message: Message) => Message,
): ChatsData {
  const messages = ownValue(data.messages, chatId);
  const index = messages?.findIndex(match) ?? -1;
  if (!messages || index === -1) return data;
  const current = messages[index] as Message;
  const next = update(current);
  if (next === current) return data;
  return {
    ...data,
    messages: { ...data.messages, [chatId]: messages.with(index, next) },
  };
}

export function openChat(data: ChatsData, input: OpenChatInput): ChatsData {
  if (ownValue(data.chats, input.chatId)) return data;
  const chat: Chat = {
    id: input.chatId,
    title: input.title,
    phone: input.phone,
    username: input.username,
    unread: 0,
    lastActivityAt: input.now,
  };
  return {
    ...data,
    chats: { ...data.chats, [chat.id]: chat },
    messages: { ...data.messages, [chat.id]: [] },
  };
}

/** A chat created by phone may later be addressed by a different chatId; follow the phone. */
function resolveChatId(data: ChatsData, input: ReceivedMessageInput): ChatsData {
  if (ownValue(data.chats, input.chatId) || !input.phone) return data;
  const previous = Object.values(data.chats).find((chat) => chat.phone === input.phone);
  if (!previous) return data;

  const { [previous.id]: chat, ...chats } = data.chats;
  const { [previous.id]: messages = [], ...rest } = data.messages;
  return {
    ...data,
    chats: { ...chats, [input.chatId]: { ...(chat as Chat), id: input.chatId } },
    messages: {
      ...rest,
      [input.chatId]: messages.map((message) => ({ ...message, chatId: input.chatId })),
    },
  };
}

/**
 * A send that timed out or lost its connection is shown as failed, yet GREEN-API may have
 * accepted it. Its outgoingAPIMessageReceived echo then adopts that bubble instead of adding
 * a twin: same chat, same text, around the same time, still without idMessage.
 * Pending bubbles are left alone: their own SendMessage answer (or markMessageSent's echo
 * merge) settles them, and adopting would pin the echo of an earlier attempt to a retry.
 */
function adoptAmbiguousSend(data: ChatsData, input: ReceivedMessageInput): ChatsData | null {
  if (input.direction !== 'outgoing' || !input.viaApi) return null;
  const candidate = ownValue(data.messages, input.chatId)?.find(
    (message) =>
      message.direction === 'outgoing' &&
      message.idMessage === null &&
      message.status === 'failed' &&
      message.text === input.text &&
      Math.abs(message.timestamp - input.timestamp) <= AMBIGUOUS_ECHO_WINDOW_MS,
  );
  if (!candidate) return null;
  return updateMessage(
    data,
    input.chatId,
    (message) => message === candidate,
    (message) =>
      reviseMessage(message, { idMessage: input.idMessage, status: 'sent', error: null }),
  );
}

export function receiveMessage(data: ChatsData, input: ReceivedMessageInput): ChatsData {
  const resolved = resolveChatId(data, input);
  const known = ownValue(resolved.messages, input.chatId)?.some(
    (message) => message.idMessage === input.idMessage,
  );
  if (known) return resolved;

  const adopted = adoptAmbiguousSend(resolved, input);
  if (adopted) return adopted;

  const existing = ownValue(resolved.chats, input.chatId);
  const isUnread = input.direction === 'incoming' && !input.isActive;
  const chat: Chat = {
    id: input.chatId,
    title:
      input.chatName ??
      existing?.title ??
      (input.phone ? SharedLib.formatPhone(input.phone) : input.chatId),
    phone: existing?.phone ?? input.phone,
    username: existing?.username ?? null,
    unread: (existing?.unread ?? 0) + (isUnread ? 1 : 0),
    lastActivityAt: Math.max(existing?.lastActivityAt ?? 0, input.timestamp),
  };
  const message: Message = {
    localId: input.localId,
    idMessage: input.idMessage,
    chatId: input.chatId,
    direction: input.direction,
    kind: input.kind,
    text: input.text,
    timestamp: input.timestamp,
    status: input.direction === 'outgoing' ? 'sent' : null,
    error: null,
    rev: 0,
  };

  return {
    ...resolved,
    chats: { ...resolved.chats, [chat.id]: chat },
    messages: {
      ...resolved.messages,
      [chat.id]: appendMessage(ownValue(resolved.messages, chat.id) ?? [], message),
    },
  };
}

export function addPendingMessage(data: ChatsData, input: PendingMessageInput): ChatsData {
  const message: Message = {
    localId: input.localId,
    idMessage: null,
    chatId: input.chatId,
    direction: 'outgoing',
    kind: 'text',
    text: input.text,
    timestamp: input.timestamp,
    status: 'pending',
    error: null,
    rev: 0,
  };
  const withMessage: ChatsData = {
    ...data,
    messages: {
      ...data.messages,
      [input.chatId]: appendMessage(ownValue(data.messages, input.chatId) ?? [], message),
    },
  };
  return patchChat(withMessage, input.chatId, (chat) => ({
    ...chat,
    lastActivityAt: Math.max(chat.lastActivityAt, input.timestamp),
  }));
}

interface LocalMessageRef {
  chatId: string;
  localId: string;
}

export function markMessageSent(
  data: ChatsData,
  { chatId, localId, idMessage }: LocalMessageRef & { idMessage: string },
): ChatsData {
  const messages = ownValue(data.messages, chatId) ?? [];
  if (!messages.some((message) => message.localId === localId)) return data;

  // The outgoingAPIMessageReceived echo may have landed first: fold it into the optimistic message.
  const echo = messages.find(
    (message) => message.idMessage === idMessage && message.localId !== localId,
  );
  const withoutEcho: ChatsData = echo
    ? {
        ...data,
        messages: {
          ...data.messages,
          [chatId]: messages.filter((message) => message !== echo),
        },
      }
    : data;

  return updateMessage(
    withoutEcho,
    chatId,
    (message) => message.localId === localId,
    (message) =>
      reviseMessage(message, {
        idMessage,
        status: mergeStatus(mergeStatus(message.status, 'sent'), echo?.status ?? 'sent'),
        error: null,
      }),
  );
}

export function markMessageFailed(
  data: ChatsData,
  { chatId, localId, error }: LocalMessageRef & { error: string },
): ChatsData {
  return updateMessage(
    data,
    chatId,
    (message) => message.localId === localId,
    (message) =>
      message.status === 'pending' ? reviseMessage(message, { status: 'failed', error }) : message,
  );
}

export function retryMessage(data: ChatsData, { chatId, localId }: LocalMessageRef): ChatsData {
  return updateMessage(
    data,
    chatId,
    (message) => message.localId === localId,
    (message) => reviseMessage(message, { status: 'pending', error: null }),
  );
}

export function applyStatus(data: ChatsData, input: StatusUpdateInput): ChatsData {
  const hasMessage = (chatId: string) =>
    ownValue(data.messages, chatId)?.some((message) => message.idMessage === input.idMessage) ??
    false;
  // Statuses may address the chat in another format (e.g. phone@c.us); idMessage is unique anyway.
  const chatId = hasMessage(input.chatId)
    ? input.chatId
    : Object.keys(data.messages).find(hasMessage);
  if (!chatId) return data;

  return updateMessage(
    data,
    chatId,
    (message) => message.idMessage === input.idMessage,
    (message) => {
      const status = mergeStatus(message.status, input.status);
      if (status === message.status) return message;
      return reviseMessage(message, { status, error: status === 'failed' ? input.reason : null });
    },
  );
}

export function markChatRead(data: ChatsData, chatId: string): ChatsData {
  const chat = ownValue(data.chats, chatId);
  if (!chat || chat.unread === 0) return data;
  return patchChat(data, chatId, (current) => ({ ...current, unread: 0 }));
}
