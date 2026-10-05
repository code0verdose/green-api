import { useMemo } from 'react';

import { SharedHooks } from '@shared';

import { toMessageDayGroupViews } from '../../lib/chat-view.util';
import type { Message } from '../../types/chat.types';
import { useChatStore } from '../stores/chat.store';

const NO_MESSAGES: Message[] = [];

/** The day-grouped message feed of one chat, ready to render. */
export function useChatFeed(chatId: string) {
  const messages = useChatStore((state) => state.messages[chatId] ?? NO_MESSAGES);
  const now = SharedHooks.useCurrentTime();

  const groups = useMemo(() => toMessageDayGroupViews(messages, now), [messages, now]);
  const last = messages.at(-1);

  return {
    groups,
    isEmpty: messages.length === 0,
    /** Changes whenever the feed grows, so the view can follow new messages. */
    scrollKey: `${messages.length}:${last?.localId ?? ''}`,
    /** The user just sent something: show it even if they had scrolled up. */
    forceScroll: last?.direction === 'outgoing' && last.status === 'pending',
  };
}
