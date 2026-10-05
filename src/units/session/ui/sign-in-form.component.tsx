import {
  Alert,
  Anchor,
  Button,
  PasswordInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

import { useSignInForm } from '../service/hooks/use-sign-in-form.hook';
import { MessengerOption } from './messenger-option.component';
import classes from './sign-in-form.module.css';

interface SignInFormProps {
  onSignedIn: () => void;
}

export function SignInForm({ onSignedIn }: SignInFormProps) {
  const {
    form,
    messenger,
    messengerOptions,
    onMessengerChange,
    onSubmit,
    isPending,
    error,
    consoleUrl,
  } = useSignInForm({ onSignedIn });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Stack gap="md">
        <SegmentedControl
          fullWidth
          radius="md"
          value={messenger}
          onChange={onMessengerChange}
          aria-label="Мессенджер"
          data={messengerOptions.map((option) => ({
            value: option.value,
            label: <MessengerOption messenger={option.value} label={option.label} />,
          }))}
        />
        <TextInput
          label="idInstance"
          placeholder="Номер инстанса из личного кабинета"
          inputMode="numeric"
          autoComplete="off"
          key={form.key('idInstance')}
          {...form.getInputProps('idInstance')}
        />
        <PasswordInput
          label="apiTokenInstance"
          placeholder="Ключ доступа инстанса"
          autoComplete="off"
          key={form.key('apiTokenInstance')}
          {...form.getInputProps('apiTokenInstance')}
        />
        <TextInput
          label="apiUrl"
          description={
            <>
              Хост API инстанса — скопируйте из{' '}
              <Anchor href={consoleUrl} target="_blank" rel="noreferrer" size="xs">
                личного кабинета
              </Anchor>
            </>
          }
          inputMode="url"
          autoComplete="off"
          key={form.key('apiUrl')}
          {...form.getInputProps('apiUrl')}
        />
        {error && (
          <Alert color="red" variant="light" icon={<IconAlertCircle size={18} />} role="alert">
            {error}
          </Alert>
        )}
        <Button type="submit" size="md" radius="md" fullWidth loading={isPending}>
          Войти
        </Button>
        <Text className={classes.hint} size="xs">
          Токен хранится только в этой вкладке и уходит напрямую в GREEN-API. «Выйти» удаляет его и
          переписку с устройства.
        </Text>
      </Stack>
    </form>
  );
}
