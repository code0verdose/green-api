/** The single source of TanStack Query keys. Invalidate by these, never by ad-hoc arrays. */
export const QueryKeys = {
  Instance: {
    state: (idInstance: string) => ['instance', idInstance, 'state'] as const,
    settings: (idInstance: string) => ['instance', idInstance, 'settings'] as const,
  },
} as const;
