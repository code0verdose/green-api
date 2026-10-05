import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useMemo } from 'react';

import { SessionService } from '@units/session';

import { queryClient, router } from './router';
import { createAppTheme } from './theme/mantine-theme.config';

export function AppProviders() {
  const messenger = SessionService.useActiveMessenger();
  const theme = useMemo(() => createAppTheme(messenger), [messenger]);

  return (
    <MantineProvider theme={theme} forceColorScheme="light">
      <Notifications position="top-right" limit={3} />
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>
  );
}
