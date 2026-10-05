import { ActionIcon, Text, Textarea } from '@mantine/core';
import { IconSend2 } from '@tabler/icons-react';

import type { SharedApi } from '@shared';

import { useMessageComposer } from '../service/hooks/use-message-composer.hook';
import classes from './message-composer.module.css';

interface MessageComposerProps {
  chatId: string;
  client: SharedApi.GreenApiClient;
  maxLength: number;
}

export function MessageComposer({ chatId, client, maxLength }: MessageComposerProps) {
  const { text, canSend, counter, onChange, onKeyDown, onSubmit } = useMessageComposer({
    client,
    chatId,
    maxLength,
  });

  return (
    <form className={classes.root} onSubmit={onSubmit}>
      <div className={classes.field}>
        <Textarea
          classNames={{ input: classes.input }}
          value={text}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="Сообщение"
          aria-label="Текст сообщения"
          autosize
          minRows={1}
          maxRows={6}
          variant="unstyled"
          autoFocus
        />
        {counter.visible && (
          <Text
            className={classes.counter}
            data-over={counter.isOverLimit || undefined}
            size="xs"
            aria-live={counter.isOverLimit ? 'polite' : 'off'}
          >
            {counter.label}
          </Text>
        )}
      </div>
      <ActionIcon
        type="submit"
        className={classes.send}
        size={40}
        radius="xl"
        disabled={!canSend}
        aria-label="Отправить"
      >
        <IconSend2 size={20} />
      </ActionIcon>
    </form>
  );
}
