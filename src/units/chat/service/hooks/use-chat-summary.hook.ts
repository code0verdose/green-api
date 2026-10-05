import { describeContact, getInitials, pickAvatarColor } from '../../lib/chat-view.util';
import { useChatStore } from '../stores/chat.store';

/** Name, contact line and avatar of one chat — for its header. Null if the chat is unknown. */
export function useChatSummary(chatId: string) {
  const chat = useChatStore((state) => state.chats[chatId]);
  if (!chat) return null;
  return {
    title: chat.title,
    subtitle: describeContact(chat),
    initials: getInitials(chat.title),
    color: pickAvatarColor(chat.id),
  };
}
