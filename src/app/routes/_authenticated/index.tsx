import { createFileRoute } from '@tanstack/react-router';

import { ChatsIndexPage } from '@pages/chats';

export const Route = createFileRoute('/_authenticated/')({
  component: ChatsIndexPage,
});
