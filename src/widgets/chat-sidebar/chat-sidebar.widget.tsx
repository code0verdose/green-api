import { ActionIcon, ScrollArea, Title, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';

import { ChatUi } from '@units/chat';
import { NotificationUi } from '@units/notification';
import { SessionUi } from '@units/session';
import type { SharedApi, SharedConfig } from '@shared';

import classes from './chat-sidebar.module.css';

interface ChatSidebarProps {
  client: SharedApi.GreenApiClient;
  messenger: SharedConfig.Messenger;
  activeChatId: string | undefined;
  onSignOut: () => void;
}

/** Left column: title with the connection status, "new chat", account menu, the chat list. */
export function ChatSidebar({ client, messenger, activeChatId, onSignOut }: ChatSidebarProps) {
  const [isNewChatOpen, newChat] = useDisclosure(false);
  const navigate = useNavigate();

  const openCreatedChat = (chatId: string) => {
    newChat.close();
    void navigate({ to: '/chats/$chatId', params: { chatId } });
  };

  return (
    <div className={classes.root}>
      <header className={classes.header}>
        <div className={classes.heading}>
          <Title order={1} className={classes.title}>
            Чаты
          </Title>
          <NotificationUi.ConnectionStatus />
        </div>
        <Tooltip label="Новый чат">
          <ActionIcon
            variant="subtle"
            size="lg"
            radius="xl"
            onClick={newChat.open}
            aria-label="Новый чат"
          >
            <IconEdit size={22} />
          </ActionIcon>
        </Tooltip>
        <SessionUi.AccountMenu onSignOut={onSignOut} />
      </header>
      <ScrollArea className={classes.list} type="hover" scrollbarSize={6}>
        <ChatUi.ChatList activeChatId={activeChatId} onCreateChat={newChat.open} />
      </ScrollArea>
      <ChatUi.NewChatModal
        opened={isNewChatOpen}
        onClose={newChat.close}
        client={client}
        messenger={messenger}
        onCreated={openCreatedChat}
      />
    </div>
  );
}
