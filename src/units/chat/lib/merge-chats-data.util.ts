import { MAX_MESSAGES_PER_CHAT } from '../model/constants/chat-store.constant';
import type { Chat, ChatsData, Message, MessageStatus } from '../types/chat.types';
import { ownValue } from './own-key.util';

const RANK: Record<MessageStatus, number> = {
  pending: 0,
  failed: 1,
  sent: 2,
  delivered: 3,
  read: 4,
};

const rank = (message: Message) => (message.status ? RANK[message.status] : 0);

/**
 * Two copies of one bubble (same localId): the later edit wins; the status rank only breaks a
 * tie (e.g. a status no tab has seen yet).
 */
const isNewer = (candidate: Message, current: Message) =>
  candidate.rev === current.rev ? rank(candidate) > rank(current) : candidate.rev > current.rev;

/**
 * Twins (one idMessage under two localIds) were edited in different tabs, so their revisions
 * do not compare: the further status wins, the revision only breaks a tie.
 */
const isFurther = (candidate: Message, current: Message) =>
  rank(candidate) === rank(current) ? candidate.rev > current.rev : rank(candidate) > rank(current);

/**
 * One GREEN-API message is one bubble. The sender tab's optimistic copy and the API echo the
 * polling tab received meet here under different localIds. The further copy wins but keeps the
 * slot and localId of the first one, so the other tab matches it by localId and drops its own
 * stale copy; it also takes the highest revision of the twins, so no stale copy outranks it.
 */
function dedupeByIdMessage(messages: Message[]): Message[] {
  const winners = new Map<string, Message>();
  const topRev = new Map<string, number>();
  for (const message of messages) {
    if (message.idMessage === null) continue;
    const current = winners.get(message.idMessage);
    if (!current || isFurther(message, current)) winners.set(message.idMessage, message);
    topRev.set(message.idMessage, Math.max(topRev.get(message.idMessage) ?? 0, message.rev));
  }
  const placed = new Set<string>();
  return messages.flatMap((message) => {
    if (message.idMessage === null) return [message];
    if (placed.has(message.idMessage)) return [];
    placed.add(message.idMessage);
    const winner = winners.get(message.idMessage) ?? message;
    const rev = topRev.get(message.idMessage) ?? winner.rev;
    if (winner === message && rev === message.rev) return [message];
    return [{ ...winner, localId: message.localId, rev }];
  });
}

function mergeMessages(local: Message[], stored: Message[]): Message[] {
  const localById = new Map(local.map((message) => [message.localId, message]));
  const storedIds = new Set(stored.map((message) => message.localId));
  const storedIdMessages = new Set(stored.flatMap((message) => message.idMessage ?? []));
  // What this tab holds before the first message both sides know is older than the stored
  // window: the other tab dropped it at the cap or trimmed it on a full storage. Returning it
  // would reorder the feed and make the tabs hand it back and forth forever.
  const firstShared = local.findIndex(
    (message) =>
      storedIds.has(message.localId) ||
      (message.idMessage !== null && storedIdMessages.has(message.idMessage)),
  );
  const united = [
    ...stored.map((message) => {
      const mine = localById.get(message.localId);
      return mine && isNewer(mine, message) ? mine : message;
    }),
    // A twin at the shared point itself is kept for the dedupe to compare it with its stored copy.
    ...local.filter((message, index) => index >= firstShared && !storedIds.has(message.localId)),
  ];
  return dedupeByIdMessage(united).slice(-MAX_MESSAGES_PER_CHAT);
}

/** The stored chat object itself unless this tab saw later activity: identity means "nothing new". */
function mergeChat(local: Chat | undefined, stored: Chat | undefined): Chat {
  if (!local) return stored as Chat;
  if (!stored) return local;
  return local.lastActivityAt > stored.lastActivityAt
    ? { ...stored, lastActivityAt: local.lastActivityAt }
    : stored;
}

/**
 * Union of this tab's history and the one another tab of the same instance just stored.
 * Tabs write the whole history, so replacing would drop whatever this tab received in between;
 * a union by localId / idMessage never loses a message and keeps the latest edit of each.
 *
 * The stored order comes first and this tab's additions after it, and every record this tab
 * does not improve is the stored object itself — `addsToStored` relies on that identity.
 */
export function mergeChatsData(local: ChatsData, stored: ChatsData): ChatsData {
  const chatIds = new Set([...Object.keys(stored.chats), ...Object.keys(local.chats)]);
  const chats: Record<string, Chat> = {};
  const messages: Record<string, Message[]> = {};

  for (const chatId of chatIds) {
    chats[chatId] = mergeChat(ownValue(local.chats, chatId), ownValue(stored.chats, chatId));
    messages[chatId] = mergeMessages(
      ownValue(local.messages, chatId) ?? [],
      ownValue(stored.messages, chatId) ?? [],
    );
  }

  return { owner: stored.owner ?? local.owner, chats, messages };
}

/**
 * Whether the merge holds anything the stored history lacks: a chat, later activity, a message
 * or a newer revision of one. Only then is a write-back worth it. Compared by identity, so key
 * order, the cap and the quota trim never count as news.
 */
export function addsToStored(merged: ChatsData, stored: ChatsData): boolean {
  return Object.keys(merged.chats).some((chatId) => {
    if (ownValue(merged.chats, chatId) !== ownValue(stored.chats, chatId)) return true;
    const known = new Set(ownValue(stored.messages, chatId) ?? []);
    return (ownValue(merged.messages, chatId) ?? []).some((message) => !known.has(message));
  });
}
