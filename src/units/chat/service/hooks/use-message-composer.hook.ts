import { type ChangeEvent, type FormEvent, type KeyboardEvent, useState } from 'react';

import { SharedLib, type SharedApi } from '@shared';

import { useSendMessageMutation } from '../mutations/send-message.mutation';

/** Show the counter only near the limit, as messengers do. */
const COUNTER_THRESHOLD = 0.9;

interface UseMessageComposerParams {
  client: SharedApi.GreenApiClient;
  chatId: string;
  maxLength: number;
}

/** Text input of one chat: Enter sends, Shift+Enter breaks the line, IME input is respected. */
export function useMessageComposer({ client, chatId, maxLength }: UseMessageComposerParams) {
  const [text, setText] = useState('');
  const sendMessage = useSendMessageMutation(client);

  const trimmed = text.trim();
  const isOverLimit = trimmed.length > maxLength;
  const canSend = trimmed.length > 0 && !isOverLimit;

  const send = () => {
    if (!canSend) return;
    sendMessage.mutate({ chatId, localId: SharedLib.createLocalId(), text: trimmed });
    setText('');
  };

  return {
    text,
    canSend,
    counter: {
      visible: trimmed.length >= maxLength * COUNTER_THRESHOLD,
      label: `${trimmed.length} / ${maxLength}`,
      isOverLimit,
    },
    onChange: (event: ChangeEvent<HTMLTextAreaElement>) => setText(event.currentTarget.value),
    onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
      event.preventDefault();
      send();
    },
    onSubmit: (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      send();
    },
  };
}
