import { ActionIcon, Menu } from '@mantine/core';
import { IconExternalLink, IconLogout } from '@tabler/icons-react';

import { SharedUi } from '@shared';

import { useAccount } from '../service/hooks/use-account.hook';

interface AccountMenuProps {
  onSignOut: () => void;
}

export function AccountMenu({ onSignOut }: AccountMenuProps) {
  const account = useAccount();
  if (!account) return null;

  return (
    <Menu position="bottom-end" shadow="md" radius="md" width={260}>
      <Menu.Target>
        <ActionIcon variant="subtle" size="lg" radius="xl" aria-label="Аккаунт">
          <SharedUi.MessengerLogo messenger={account.messenger} size={28} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>
          {account.messengerLabel} · инстанс {account.idInstance}
        </Menu.Label>
        <Menu.Item
          component="a"
          href={account.consoleUrl}
          target="_blank"
          rel="noreferrer"
          leftSection={<IconExternalLink size={16} />}
        >
          Личный кабинет GREEN-API
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={onSignOut}>
          Выйти
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
