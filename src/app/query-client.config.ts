import { MutationCache, QueryClient } from '@tanstack/react-query';

import { SharedApi, SharedLib, SharedUi } from '@shared';

const MAX_QUERY_RETRIES = 1;

/**
 * One safety-net toast per failed mutation. Skipped when the mutation shows its error itself
 * (local onError or meta.handlesErrors) and for cancelled requests.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Wrong credentials or a misconfigured instance will not fix themselves on retry.
        retry: (failureCount, error) =>
          failureCount < MAX_QUERY_RETRIES &&
          !(SharedApi.isGreenApiError(error) && !error.isRetryable),
      },
    },
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.options.onError || mutation.meta?.handlesErrors) return;
        if (SharedApi.isAbortError(error)) return;
        SharedUi.notify.error(SharedLib.getErrorMessage(error));
      },
    }),
  });
}
