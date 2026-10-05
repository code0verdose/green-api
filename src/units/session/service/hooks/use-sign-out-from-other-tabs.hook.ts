import { useEffect, useEffectEvent } from 'react';

import { isSignOutSignal } from '../../lib/sign-out-signal.util';

/** Runs `onSignedOut` when another tab of the same instance signs out. */
export function useSignOutFromOtherTabs(ownerKey: string, onSignedOut: () => void) {
  const handleSignOut = useEffectEvent(() => onSignedOut());

  // Legitimate effect: subscription to an external event source (other tabs via `storage`).
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (isSignOutSignal(event, ownerKey)) handleSignOut();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [ownerKey]);
}
