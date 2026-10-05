import type {} from '@tanstack/react-query';

export interface AppMutationMeta extends Record<string, unknown> {
  /** The caller renders the error itself (form field, failed bubble): skip the global toast. */
  handlesErrors?: boolean;
}

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: AppMutationMeta;
  }
}
