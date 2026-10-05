import { ScrollArea } from '@mantine/core';
import { IconMessageCircle } from '@tabler/icons-react';
import { Fragment } from 'react';

import { SharedHooks, SharedUi, type SharedApi } from '@shared';

import { useChatFeed } from '../service/hooks/use-chat-feed.hook';
import { useRetryMessage } from '../service/hooks/use-retry-message.hook';
import { DaySeparator } from './day-separator.component';
import { MessageBubble } from './message-bubble.component';
import classes from './message-feed.module.css';

interface MessageFeedProps {
  chatId: string;
  client: SharedApi.GreenApiClient;
}

export function MessageFeed({ chatId, client }: MessageFeedProps) {
  const { groups, isEmpty, scrollKey, forceScroll } = useChatFeed(chatId);
  const retry = useRetryMessage(client);
  const { viewportRef, onScroll } = SharedHooks.useStickToBottom(scrollKey, { force: forceScroll });

  return (
    <ScrollArea
      className={classes.root}
      viewportRef={viewportRef}
      onScrollPositionChange={onScroll}
      type="hover"
      scrollbarSize={6}
    >
      <div className={classes.content} role="log" aria-live="polite" aria-label="Сообщения">
        {isEmpty ? (
          <div className={classes.empty}>
            <SharedUi.EmptyState
              icon={<IconMessageCircle size={32} />}
              title="Сообщений пока нет"
              description="Напишите первое сообщение — ответ собеседника появится здесь."
            />
          </div>
        ) : (
          groups.map((group) => (
            <Fragment key={group.key}>
              <DaySeparator label={group.label} />
              {group.messages.map((message) => (
                <MessageBubble key={message.localId} message={message} onRetry={retry} />
              ))}
            </Fragment>
          ))
        )}
      </div>
    </ScrollArea>
  );
}
