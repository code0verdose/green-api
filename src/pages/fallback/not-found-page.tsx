import { Button } from '@mantine/core';
import { IconMapOff } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';

import { SharedUi } from '@shared';

import classes from './fallback-page.module.css';

export function NotFoundPage() {
  return (
    <main className={classes.root}>
      <SharedUi.EmptyState
        icon={<IconMapOff size={32} />}
        title="Страница не найдена"
        description="Похоже, ссылка устарела. Вернитесь к списку чатов."
        action={
          <Button component={Link} to="/">
            К чатам
          </Button>
        }
      />
    </main>
  );
}
