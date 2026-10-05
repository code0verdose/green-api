import { SharedLib } from '@shared';

import { AVATAR_COLORS } from '../model/constants/avatar-colors.constant';
import type {
  Chat,
  ChatListItem,
  ChatListItemView,
  ChatsData,
  Message,
  MessageDayGroup,
  MessageDayGroupView,
} from '../types/chat.types';
import { reviseMessage } from './revise-message.util';

export function buildChatListItems(data: ChatsData): ChatListItem[] {
  return Object.values(data.chats)
    .map((chat) => ({ chat, lastMessage: data.messages[chat.id]?.at(-1) ?? null }))
    .sort((a, b) => b.chat.lastActivityAt - a.chat.lastActivityAt);
}

export function groupMessagesByDay(messages: Message[], now: number): MessageDayGroup[] {
  const groups: MessageDayGroup[] = [];
  for (const message of messages) {
    const current = groups.at(-1);
    const first = current?.messages[0];
    if (current && first && SharedLib.isSameDay(first.timestamp, message.timestamp)) {
      current.messages.push(message);
    } else {
      groups.push({
        key: new Date(message.timestamp).toDateString(),
        label: SharedLib.formatDayLabel(message.timestamp, now),
        messages: [message],
      });
    }
  }
  return groups;
}

/** Two letters from the first two words; "#" when the title is a phone number. */
export function getInitials(title: string): string {
  const words = title
    .trim()
    .split(/\s+/)
    .filter((word) => /\p{L}/u.test(word));
  const letters = words
    .slice(0, 2)
    .map((word) => word.match(/\p{L}/u)?.[0] ?? '')
    .join('');
  return letters ? letters.toUpperCase() : '#';
}

export function pickAvatarColor(chatId: string): string {
  let hash = 0;
  for (const char of chatId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] as string;
}

const INTERRUPTED_SEND_ERROR =
  'Страница закрылась до ответа GREEN-API — сообщение могло уйти. Если собеседник его не получил, повторите.';

/** A pending message restored from storage lost its request with the old page; let the user retry. */
export function failInterruptedSends(data: ChatsData): ChatsData {
  const hasPending = Object.values(data.messages).some((messages) =>
    messages.some((message) => message.status === 'pending'),
  );
  if (!hasPending) return data;
  return {
    ...data,
    messages: Object.fromEntries(
      Object.entries(data.messages).map(([chatId, messages]) => [
        chatId,
        messages.map((message) =>
          message.status === 'pending'
            ? reviseMessage(message, { status: 'failed', error: INTERRUPTED_SEND_ERROR })
            : message,
        ),
      ]),
    ),
  };
}

/** "+7 999 123-45-67" or "@username" — what identifies the chat partner under the name. */
export function describeContact(chat: Pick<Chat, 'phone' | 'username'>): string {
  if (chat.phone) return SharedLib.formatPhone(chat.phone);
  return chat.username ?? '';
}

export function toChatListItemView(
  { chat, lastMessage }: ChatListItem,
  activeChatId: string | undefined,
  now: number,
): ChatListItemView {
  const firstLine = lastMessage?.text.split('\n', 1)[0] ?? '';
  const preview = lastMessage
    ? `${lastMessage.direction === 'outgoing' ? 'Вы: ' : ''}${firstLine}`
    : describeContact(chat) || 'Нет сообщений';
  return {
    id: chat.id,
    title: chat.title,
    preview,
    time: lastMessage ? SharedLib.formatChatListTime(lastMessage.timestamp, now) : '',
    unread: chat.unread,
    isActive: chat.id === activeChatId,
    initials: getInitials(chat.title),
    color: pickAvatarColor(chat.id),
    lastStatus: lastMessage?.direction === 'outgoing' ? lastMessage.status : null,
  };
}

export function toMessageDayGroupViews(messages: Message[], now: number): MessageDayGroupView[] {
  return groupMessagesByDay(messages, now).map((group) => ({
    ...group,
    messages: group.messages.map((message) => ({
      ...message,
      time: SharedLib.formatMessageTime(message.timestamp),
    })),
  }));
}
