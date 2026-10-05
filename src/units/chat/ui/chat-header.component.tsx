import { ActionIcon, Text } from '@mantine/core';
import { IconChevronLeft } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';

import { useChatSummary } from '../service/hooks/use-chat-summary.hook';
import { ChatAvatar } from './chat-avatar.component';
import classes from './chat-header.module.css';

interface ChatHeaderProps {
  chatId: string;
}

export function ChatHeader({ chatId }: ChatHeaderProps) {
  const chat = useChatSummary(chatId);
  if (!chat) return null;

  return (
    <header className={classes.root}>
      <ActionIcon
        component={Link}
        to="/"
        variant="subtle"
        size="lg"
        radius="xl"
        className={classes.back}
        aria-label="К списку чатов"
      >
        <IconChevronLeft size={22} />
      </ActionIcon>
      <ChatAvatar initials={chat.initials} color={chat.color} size={40} />
      <div className={classes.titles}>
        <Text component="h2" className={classes.title} truncate>
          {chat.title}
        </Text>
        {chat.subtitle && chat.subtitle !== chat.title && (
          <Text className={classes.subtitle} size="xs" truncate>
            {chat.subtitle}
          </Text>
        )}
      </div>
    </header>
  );
}
