import { Outlet, useParams } from '@tanstack/react-router';

import { SessionService, SessionUi, type SessionTypes } from '@units/session';
import { ChatSidebar } from '@widgets/chat-sidebar';

import { useNotificationBridge } from '../hooks/use-notification-bridge.hook';
import { useSignOut } from '../hooks/use-sign-out.hook';
import classes from './chats-shell.module.css';

interface ChatsShellProps {
  session: SessionTypes.Session;
}

/** Two-column messenger shell; on phones it shows either the list or the open chat. */
export function ChatsShell({ session }: ChatsShellProps) {
  const client = SessionService.useGreenApiClient(session);
  const { chatId } = useParams({ strict: false });
  const { signOut, followSignOut, expireSession, ownerKey } = useSignOut(session);
  useNotificationBridge({ session, client, onSessionExpired: expireSession });
  SessionService.useSignOutFromOtherTabs(ownerKey, followSignOut);

  return (
    <div className={classes.root} data-chat-open={chatId ? true : undefined}>
      <aside className={classes.sidebar}>
        <ChatSidebar
          client={client}
          messenger={session.messenger}
          activeChatId={chatId}
          onSignOut={signOut}
        />
      </aside>
      <main className={classes.main}>
        <SessionUi.InstanceBanner client={client} idInstance={session.idInstance} />
        <Outlet />
      </main>
    </div>
  );
}
