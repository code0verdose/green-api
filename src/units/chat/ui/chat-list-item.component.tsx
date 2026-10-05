import { Badge, Text } from '@mantine/core';
import { Link } from '@tanstack/react-router';
import { memo } from 'react';

import type { ChatListItemView } from '../types/chat.types';
import { ChatAvatar } from './chat-avatar.component';
import classes from './chat-list-item.module.css';
import { MessageStatusIcon } from './message-status-icon.component';

interface ChatListItemProps {
  item: ChatListItemView;
}

export const ChatListItem = memo(function ChatListItem({ item }: ChatListItemProps) {
  return (
    <Link
      to="/chats/$chatId"
      params={{ chatId: item.id }}
      className={classes.root}
      data-active={item.isActive || undefined}
      aria-current={item.isActive ? 'page' : undefined}
    >
      <ChatAvatar initials={item.initials} color={item.color} />
      <div className={classes.body}>
        <div className={classes.row}>
          <Text className={classes.title} truncate>
            {item.title}
          </Text>
          {item.lastStatus && <MessageStatusIcon status={item.lastStatus} size={14} />}
          <Text className={classes.time} size="xs">
            {item.time}
          </Text>
        </div>
        <div className={classes.row}>
          <Text className={classes.preview} size="sm" truncate>
            {item.preview}
          </Text>
          {item.unread > 0 && (
            <Badge
              className={classes.unread}
              size="md"
              radius="xl"
              aria-label={`Непрочитанных: ${item.unread}`}
            >
              {item.unread}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
});
