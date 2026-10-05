import { createFileRoute, redirect } from '@tanstack/react-router';

import { ChatsLayout } from '@pages/chats';
import { ChatService } from '@units/chat';
import { SessionLib, SessionService } from '@units/session';

/** Guard for everything behind the login; runs before any child loads or renders. */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    const session = SessionService.getSession();
    if (!session) {
      const search = location.href === '/' ? {} : { redirect: location.href };
      throw redirect({ to: '/login', search });
    }
    ChatService.activateChatOwner(SessionLib.toOwnerKey(session));
  },
  component: ChatsLayout,
});
