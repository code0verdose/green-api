import { Button } from '@mantine/core';
import { IconBug, IconRefresh } from '@tabler/icons-react';
import type { ErrorComponentProps } from '@tanstack/react-router';

import { SharedLib, SharedUi } from '@shared';

import classes from './fallback-page.module.css';

/** Route-level error boundary: explains the failure and offers the retry that can help. */
export function RouteErrorPage({ error, reset }: ErrorComponentProps) {
  if (SharedLib.isStaleChunkError(error)) {
    return (
      <main className={classes.root} role="alert">
        <SharedUi.EmptyState
          icon={<IconRefresh size={32} />}
          title="Вышла новая версия"
          description="Обновите страницу, чтобы загрузить её. Переписка сохранится."
          action={<Button onClick={() => window.location.reload()}>Обновить страницу</Button>}
        />
      </main>
    );
  }

  return (
    <main className={classes.root} role="alert">
      <SharedUi.EmptyState
        icon={<IconBug size={32} />}
        title="Что-то сломалось"
        description={SharedLib.getErrorMessage(error)}
        action={<Button onClick={reset}>Попробовать снова</Button>}
      />
    </main>
  );
}
