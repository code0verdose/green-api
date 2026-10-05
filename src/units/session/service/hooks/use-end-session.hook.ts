import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useInstanceNoticesStore } from '../stores/instance-notices.store';
import { useSessionStore } from '../stores/session.store';

/** Forgets the credentials and everything cached for them. Navigation is up to the caller. */
export function useEndSession() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    useSessionStore.getState().signOut();
    useInstanceNoticesStore.getState().clear();
    queryClient.clear();
  }, [queryClient]);
}
