import { Button, Group, Text } from '@mantine/core';

import { useConnectionStatus } from '../service/hooks/use-connection-status.hook';
import classes from './connection-status.module.css';

export function ConnectionStatus() {
  const { label, tone, canRestart, restart } = useConnectionStatus();

  return (
    <Group gap={6} wrap="nowrap" role="status" aria-live="polite">
      <span className={classes.dot} data-tone={tone} aria-hidden />
      <Text size="xs" className={classes.label} data-tone={tone} truncate>
        {label}
      </Text>
      {canRestart && (
        <Button variant="subtle" size="compact-xs" onClick={restart}>
          Повторить
        </Button>
      )}
    </Group>
  );
}
