import { SessionService } from '@units/session';

import { ChatsShell } from './ui/chats-shell.component';

/**
 * The route guard keeps guests out; the null branch covers the instant between sign-out and
 * the redirect, so screens below never render without a session.
 */
export function ChatsLayout() {
  const session = SessionService.useSession();
  return session ? <ChatsShell session={session} /> : null;
}
