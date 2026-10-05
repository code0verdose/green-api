import { useMemo } from 'react';

import { SharedHooks } from '@shared';

import { buildChatListItems, toChatListItemView } from '../../lib/chat-view.util';
import { useChatStore } from '../stores/chat.store';

/** Chat list rows, newest first, ready to render. */
export function useChatList(activeChatId: string | undefined) {
  const chats = useChatStore((state) => state.chats);
  const messages = useChatStore((state) => state.messages);
  const now = SharedHooks.useCurrentTime();

  const items = useMemo(
    () =>
      buildChatListItems({ owner: null, chats, messages }).map((item) =>
        toChatListItemView(item, activeChatId, now),
      ),
    [chats, messages, activeChatId, now],
  );

  return { items, isEmpty: items.length === 0 };
}
