import type { Message } from '../types/chat.types';

type MessageChange = Partial<Pick<Message, 'idMessage' | 'status' | 'error'>>;

/** A status change made by this client; the new revision lets it win the cross-tab merge. */
export const reviseMessage = (message: Message, change: MessageChange): Message => ({
  ...message,
  ...change,
  rev: message.rev + 1,
});
