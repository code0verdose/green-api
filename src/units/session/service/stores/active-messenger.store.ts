import type { SharedConfig } from '@shared';

import { useMessengerPreferenceStore } from './messenger-preference.store';
import { useSessionStore } from './session.store';

/** The session's messenger once signed in, otherwise the one picked on the login screen. */
export const getActiveMessenger = (): SharedConfig.Messenger =>
  useSessionStore.getState().session?.messenger ?? useMessengerPreferenceStore.getState().messenger;

/** Calls `listener` now and whenever the active messenger may have changed. */
export function subscribeToActiveMessenger(listener: (messenger: SharedConfig.Messenger) => void) {
  const notify = () => listener(getActiveMessenger());
  notify();
  const unsubscribeSession = useSessionStore.subscribe(notify);
  const unsubscribePreference = useMessengerPreferenceStore.subscribe(notify);
  return () => {
    unsubscribeSession();
    unsubscribePreference();
  };
}
