import { Button, VisuallyHidden } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { memo } from 'react';

import { MESSAGE_AUTHOR_LABEL } from '../model/constants/message-status.constant';
import type { MessageView } from '../types/chat.types';
import classes from './message-bubble.module.css';
import { MessageStatusIcon } from './message-status-icon.component';

interface MessageBubbleProps {
  message: MessageView;
  onRetry: (message: MessageView) => void;
}

export const MessageBubble = memo(function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const isFailed = message.status === 'failed';

  return (
    <div className={classes.row} data-direction={message.direction}>
      <div className={classes.bubble} data-direction={message.direction} data-kind={message.kind}>
        <p className={classes.text}>
          <VisuallyHidden component="span">
            {MESSAGE_AUTHOR_LABEL[message.direction]}
          </VisuallyHidden>
          {message.text}
        </p>
        <span className={classes.meta}>
          <time dateTime={new Date(message.timestamp).toISOString()}>{message.time}</time>
          {message.status && <MessageStatusIcon status={message.status} />}
        </span>
      </div>
      {isFailed && (
        <div className={classes.failure}>
          <span>{message.error}</span>
          <Button
            variant="subtle"
            color="red"
            size="compact-xs"
            leftSection={<IconRefresh size={14} />}
            onClick={() => onRetry(message)}
          >
            Повторить
          </Button>
        </div>
      )}
    </div>
  );
});
