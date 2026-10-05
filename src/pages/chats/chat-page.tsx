import { getRouteApi } from '@tanstack/react-router';

import { SessionService } from '@units/session';
import { ChatWindow } from '@widgets/chat-window';

const route = getRouteApi('/_authenticated/chats/$chatId');

export function ChatPage() {
  const { chatId } = route.useParams();
  const { session, client } = SessionService.useRequiredSession();

  // key: one chat = one ChatWindow instance (draft, scroll, live region are per chat).
  return <ChatWindow key={chatId} chatId={chatId} client={client} messenger={session.messenger} />;
}
