import { useMemo, useSyncExternalStore } from 'react';

import { SharedApi } from '@shared';

import { toOwnerKey } from '../../lib/owner-key.util';
import type { Session } from '../../model/validation/credentials.schema';
import { getActiveMessenger, subscribeToActiveMessenger } from '../stores/active-messenger.store';
import { useSessionStore } from '../stores/session.store';

/** The current session or null — e.g. for the instant between sign-out and the redirect. */
export const useSession = () => useSessionStore((state) => state.session);

/** A GREEN-API client bound to the session's credentials, stable while they do not change. */
export function useGreenApiClient(session: Session) {
  return useMemo(() => SharedApi.createGreenApiClient(session), [session]);
}

/**
 * The signed-in session with a ready API client. Only for screens rendered under a component
 * that has already checked the session, where a missing one is a programming error.
 */
export function useRequiredSession() {
  const session = useSession();
  if (!session) throw new Error('useRequiredSession must be used behind the auth guard');
  const client = useGreenApiClient(session);
  return { session, client, ownerKey: toOwnerKey(session) };
}

/** Messenger of the session, or the one picked on the login screen: drives the theme. */
export const useActiveMessenger = () =>
  useSyncExternalStore(subscribeToActiveMessenger, getActiveMessenger);
