import type { Messenger, MessengerConfig } from './messenger.types';

export const MESSENGER_IDS = ['max', 'telegram'] as const;

export const DEFAULT_MESSENGER: Messenger = 'max';

export const GREEN_API_CONSOLE_URL = 'https://console.green-api.com';

/**
 * Everything that differs between the MAX and Telegram versions.
 * Values come from green-api.com/v3/docs (MAX) and green-api.com/telegram/docs.
 */
export const MESSENGERS: Record<Messenger, MessengerConfig> = {
  max: {
    id: 'max',
    label: 'MAX',
    maxMessageLength: 4000,
    defaultApiUrl: 'https://3100.api.green-api.com',
    docsUrl: 'https://green-api.com/v3/docs/',
  },
  telegram: {
    id: 'telegram',
    label: 'Telegram',
    maxMessageLength: 4096,
    defaultApiUrl: 'https://4100.api.green-api.com',
    docsUrl: 'https://green-api.com/telegram/docs/',
  },
};
