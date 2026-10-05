const SIGN_OUT_SIGNAL_KEY = 'green-api-chat:signed-out';

/**
 * Tells the other tabs of the same instance that the user signed out: sessionStorage is per tab,
 * so without this a second tab would keep the token and keep refilling the history.
 */
export function announceSignOut(ownerKey: string) {
  try {
    localStorage.setItem(SIGN_OUT_SIGNAL_KEY, JSON.stringify({ ownerKey, at: Date.now() }));
  } catch {
    // Storage blocked: other tabs simply keep their session.
  }
}

/** True when `event` is another tab's sign-out of the same instance. */
export function isSignOutSignal(event: StorageEvent, ownerKey: string): boolean {
  if (event.key !== SIGN_OUT_SIGNAL_KEY || !event.newValue) return false;
  try {
    return (JSON.parse(event.newValue) as { ownerKey?: unknown }).ownerKey === ownerKey;
  } catch {
    return false;
  }
}
