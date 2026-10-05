import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

export const createWrapper =
  (queryClient: QueryClient = createTestQueryClient()) =>
  ({ children }: { children: ReactNode }) => (
    <MantineProvider env="test">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MantineProvider>
  );

export function renderWithProviders(ui: ReactElement, queryClient = createTestQueryClient()) {
  return { queryClient, ...render(ui, { wrapper: createWrapper(queryClient) }) };
}

/** Renders `ui` inside a memory router (for components with <Link>) at `path`. */
export function renderWithRouter(
  ui: ReactElement,
  { path = '/', queryClient = createTestQueryClient() } = {},
) {
  const rootRoute = createRootRoute({ component: Outlet });
  const anyRoute = createRoute({ getParentRoute: () => rootRoute, path: '$', component: () => ui });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => ui,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, anyRoute]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  const view = render(<RouterProvider router={router} />, {
    wrapper: createWrapper(queryClient),
  });
  return { ...view, router, queryClient };
}
