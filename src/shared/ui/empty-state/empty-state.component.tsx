import { Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

import classes from './empty-state.module.css';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Stack className={classes.root} align="center" justify="center" gap="xs">
      {icon && <div className={classes.icon}>{icon}</div>}
      <Title order={3} className={classes.title}>
        {title}
      </Title>
      {description && (
        <Text className={classes.description} size="sm">
          {description}
        </Text>
      )}
      {action}
    </Stack>
  );
}
