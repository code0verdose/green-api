import { SharedConfig } from '@shared';

import { useSessionStore } from '../stores/session.store';

/** What the account menu shows about the signed-in instance. */
export function useAccount() {
  const session = useSessionStore((state) => state.session);
  if (!session) return null;
  return {
    messenger: session.messenger,
    messengerLabel: SharedConfig.MESSENGERS[session.messenger].label,
    idInstance: session.idInstance,
    consoleUrl: SharedConfig.GREEN_API_CONSOLE_URL,
  };
}
