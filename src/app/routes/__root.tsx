import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';

import { NotFoundPage, RouteErrorPage } from '@pages/fallback';

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  notFoundComponent: NotFoundPage,
  errorComponent: RouteErrorPage,
});
