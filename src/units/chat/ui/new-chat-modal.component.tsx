import { Button, Group, Modal, TextInput } from '@mantine/core';

import type { SharedApi, SharedConfig } from '@shared';

import { useNewChat } from '../service/hooks/use-new-chat.hook';

interface NewChatModalProps {
  opened: boolean;
  onClose: () => void;
  client: SharedApi.GreenApiClient;
  messenger: SharedConfig.Messenger;
  onCreated: (chatId: string) => void;
}

export function NewChatModal({ opened, onClose, client, messenger, onCreated }: NewChatModalProps) {
  const { form, onSubmit, isPending, field } = useNewChat({ client, messenger, onCreated });

  return (
    <Modal opened={opened} onClose={onClose} title="Новый чат" centered radius="lg">
      <form onSubmit={onSubmit} noValidate>
        <TextInput
          label={field.label}
          description={field.description}
          placeholder={field.placeholder}
          inputMode="tel"
          autoComplete="off"
          data-autofocus
          key={form.key('recipient')}
          {...form.getInputProps('recipient')}
        />
        <Group justify="flex-end" mt="lg">
          <Button variant="default" onClick={onClose} disabled={isPending}>
            Отмена
          </Button>
          <Button type="submit" loading={isPending}>
            Создать чат
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
