import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';

import { ChatService } from '@units/chat';
import { SessionLib, SessionService, type SessionTypes } from '@units/session';

/**
 * Ways to leave a session:
 * - `signOut` — the user pressed «Выйти»: forget this instance's history on the device and
 *   sign out the other tabs of the same instance;
 * - `followSignOut` — another tab of the instance did that: forget here too, without echoing
 *   the signal (otherwise this tab's next write could bring the deleted history back);
 * - `expireSession` — the token stopped working (401/403): drop the credentials only, the
 *   history stays for the next sign-in.
 */
export function useSignOut(session: SessionTypes.Session) {
  const endSession = SessionService.useEndSession();
  const navigate = useNavigate();
  const ownerKey = SessionLib.toOwnerKey(session);

  const leave = useCallback(
    (forgetHistory: boolean) => {
      if (forgetHistory) ChatService.forgetChatHistory();
      else ChatService.detachChatHistory();
      endSession();
      void navigate({ to: '/login', replace: true });
    },
    [endSession, navigate],
  );

  const signOut = useCallback(() => {
    SessionLib.announceSignOut(ownerKey);
    leave(true);
  }, [leave, ownerKey]);

  const followSignOut = useCallback(() => leave(true), [leave]);
  const expireSession = useCallback(() => leave(false), [leave]);

  return { signOut, followSignOut, expireSession, ownerKey };
}
