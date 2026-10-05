import { createFileRoute, redirect } from '@tanstack/react-router';

import { ChatPage } from '@pages/chats';
import { ChatService } from '@units/chat';

const markChatRead = ({ params }: { params: { chatId: string } }) =>
  ChatService.useChatStore.getState().markChatRead(params.chatId);

export const Route = createFileRoute('/_authenticated/chats/$chatId')({
  beforeLoad: ({ params }) => {
    // hasOwn: an id such as 'constructor' must not match Object.prototype.
    if (!Object.hasOwn(ChatService.useChatStore.getState().chats, params.chatId)) {
      throw redirect({ to: '/' });
    }
  },
  onEnter: markChatRead,
  onStay: markChatRead,
  component: ChatPage,
});
