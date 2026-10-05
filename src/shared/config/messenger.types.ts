import type { MESSENGER_IDS } from './messengers.constant';

export type Messenger = (typeof MESSENGER_IDS)[number];

export interface MessengerConfig {
  id: Messenger;
  label: string;
  /** SendMessage limit from the GREEN-API docs for this messenger. */
  maxMessageLength: number;
  /** Host from the GREEN-API docs example; the real one is shown in the personal console. */
  defaultApiUrl: string;
  docsUrl: string;
}
