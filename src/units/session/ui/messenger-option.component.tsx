import { Group } from '@mantine/core';

import { SharedUi, type SharedConfig } from '@shared';

interface MessengerOptionProps {
  messenger: SharedConfig.Messenger;
  label: string;
}

export function MessengerOption({ messenger, label }: MessengerOptionProps) {
  return (
    <Group gap={8} justify="center" wrap="nowrap">
      <SharedUi.MessengerLogo messenger={messenger} size={18} />
      <span>{label}</span>
    </Group>
  );
}
