import { Button } from '@mantine/core';
import { IconMessagePlus, IconMessages } from '@tabler/icons-react';

import { SharedUi } from '@shared';

import { useChatList } from '../service/hooks/use-chat-list.hook';
import classes from './chat-list.module.css';
import { ChatListItem } from './chat-list-item.component';

interface ChatListProps {
  activeChatId: string | undefined;
  onCreateChat: () => void;
}

export function ChatList({ activeChatId, onCreateChat }: ChatListProps) {
  const { items, isEmpty } = useChatList(activeChatId);

  if (isEmpty) {
    return (
      <SharedUi.EmptyState
        icon={<IconMessages size={32} />}
        title="Чатов пока нет"
        description="Начните переписку по номеру телефона — ответы появятся здесь."
        action={
          <Button leftSection={<IconMessagePlus size={18} />} onClick={onCreateChat}>
            Новый чат
          </Button>
        }
      />
    );
  }

  return (
    <nav aria-label="Чаты">
      <ul className={classes.list}>
        {items.map((item) => (
          <li key={item.id}>
            <ChatListItem item={item} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
