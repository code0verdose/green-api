export type MessageDirection = 'incoming' | 'outgoing';

/** Outgoing lifecycle; incoming messages carry no status. */
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export type MessageKind = 'text' | 'unsupported';

export interface Message {
  /** Client-side key; stable from the optimistic insert to the server echo. */
  localId: string;
  /** GREEN-API id; null until SendMessage answers. Used to dedupe redelivered notifications. */
  idMessage: string | null;
  chatId: string;
  direction: MessageDirection;
  kind: MessageKind;
  text: string;
  /** Milliseconds since epoch. */
  timestamp: number;
  status: MessageStatus | null;
  /** Why an outgoing message failed, in user language. */
  error: string | null;
  /**
   * Revision: bumped by every status change this client makes. Tabs of one instance merge
   * their histories, and the higher revision wins, so a retry is not undone by a tab that
   * still holds the failed copy.
   */
  rev: number;
}

export interface Chat {
  id: string;
  title: string;
  /** Digits only, e.g. 79991234567. */
  phone: string | null;
  /** Telegram @username, if the chat was created by it. */
  username: string | null;
  unread: number;
  lastActivityAt: number;
}

export interface ChatsData {
  /** `messenger:idInstance` the history belongs to; another instance starts from scratch. */
  owner: string | null;
  chats: Record<string, Chat>;
  messages: Record<string, Message[]>;
}

export interface OpenChatInput {
  chatId: string;
  title: string;
  phone: string | null;
  username: string | null;
  now: number;
}

export interface ReceivedMessageInput {
  direction: MessageDirection;
  chatId: string;
  chatName: string | null;
  phone: string | null;
  idMessage: string;
  timestamp: number;
  kind: MessageKind;
  text: string;
  localId: string;
  /** The chat is open on screen right now: an incoming message is read immediately. */
  isActive: boolean;
  /** Echo of a send made through the API (not typed on the phone, not from the partner). */
  viaApi: boolean;
}

export interface StatusUpdateInput {
  chatId: string;
  idMessage: string;
  status: Exclude<MessageStatus, 'pending'>;
  reason: string | null;
}

export interface PendingMessageInput {
  chatId: string;
  localId: string;
  text: string;
  timestamp: number;
}

export interface ChatListItem {
  chat: Chat;
  lastMessage: Message | null;
}

export interface MessageDayGroup {
  key: string;
  label: string;
  messages: Message[];
}

/** Everything a chat list row renders, already formatted. */
export interface ChatListItemView {
  id: string;
  title: string;
  preview: string;
  time: string;
  unread: number;
  isActive: boolean;
  initials: string;
  color: string;
  lastStatus: MessageStatus | null;
}

export interface MessageView extends Message {
  time: string;
}

export interface MessageDayGroupView {
  key: string;
  label: string;
  messages: MessageView[];
}
