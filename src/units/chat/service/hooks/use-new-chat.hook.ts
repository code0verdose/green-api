import { schemaResolver, useForm } from '@mantine/form';
import { useMemo } from 'react';

import { SharedLib, type SharedApi, type SharedConfig } from '@shared';

import { RECIPIENT_FIELD } from '../../model/constants/chat-texts.constant';
import {
  createNewChatFormSchema,
  type NewChatFormValues,
} from '../../model/validation/new-chat-form.schema';
import { useCreateChatMutation } from '../mutations/create-chat.mutation';

interface UseNewChatParams {
  client: SharedApi.GreenApiClient;
  messenger: SharedConfig.Messenger;
  onCreated: (chatId: string) => void;
}

/** "New chat" form: validates the recipient, resolves it with CheckAccount, opens the chat. */
export function useNewChat({ client, messenger, onCreated }: UseNewChatParams) {
  const schema = useMemo(() => createNewChatFormSchema(messenger), [messenger]);
  const form = useForm<NewChatFormValues>({
    mode: 'uncontrolled',
    initialValues: { recipient: '' },
    validate: schemaResolver(schema, { sync: true }),
  });
  const createChat = useCreateChatMutation({ client, messenger });

  const onSubmit = form.onSubmit((values) => {
    const { recipient } = schema.parse(values);
    createChat.mutate(recipient, {
      onSuccess: ({ chatId }) => {
        form.reset();
        onCreated(chatId);
      },
      onError: (error) => form.setFieldError('recipient', SharedLib.getErrorMessage(error)),
    });
  });

  return { form, onSubmit, isPending: createChat.isPending, field: RECIPIENT_FIELD[messenger] };
}
