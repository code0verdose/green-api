import { createRouter } from '@tanstack/react-router';

import { createQueryClient } from './query-client.config';
import { routeTree } from './route-tree.gen';

export const queryClient = createQueryClient();

export const router = createRouter({
  routeTree,
  context: { queryClient },
  // Sub-path hosting (VITE_BASE_PATH) reaches the router through Vite's BASE_URL.
  basepath: import.meta.env.BASE_URL,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
