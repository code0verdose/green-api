import { ChatUi } from '@units/chat';
import { SharedConfig, type SharedApi } from '@shared';

import classes from './chat-window.module.css';

interface ChatWindowProps {
  chatId: string;
  client: SharedApi.GreenApiClient;
  messenger: SharedConfig.Messenger;
}

/**
 * Right column: header, feed and composer of one chat. Mount it with `key={chatId}`: a new chat
 * gets a fresh draft and a fresh live region, so a screen reader does not re-read old history.
 */
export function ChatWindow({ chatId, client, messenger }: ChatWindowProps) {
  return (
    <section className={classes.root} aria-label="Переписка">
      <ChatUi.ChatHeader chatId={chatId} />
      <ChatUi.MessageFeed chatId={chatId} client={client} />
      <ChatUi.MessageComposer
        chatId={chatId}
        client={client}
        maxLength={SharedConfig.MESSENGERS[messenger].maxMessageLength}
      />
    </section>
  );
}
