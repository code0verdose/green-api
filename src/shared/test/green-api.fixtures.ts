import type { GreenApiCredentials } from '@shared/api';

export const TEST_CREDENTIALS: GreenApiCredentials = {
  apiUrl: 'https://4100.api.green-api.com',
  idInstance: '4100000000',
  apiTokenInstance: 'test-token-0123456789abcdef',
};

/** Base URL of a GREEN-API method for TEST_CREDENTIALS, as MSW handlers expect it. */
export const apiMethodUrl = (method: string, suffix = '') =>
  `${TEST_CREDENTIALS.apiUrl}/waInstance${TEST_CREDENTIALS.idInstance}/${method}/${TEST_CREDENTIALS.apiTokenInstance}${suffix}`;

/** Notification bodies copied from the GREEN-API docs (MAX v3 and Telegram), trimmed to what we read. */
export const incomingTextNotification = {
  typeWebhook: 'incomingMessageReceived',
  instanceData: { idInstance: 4100000000, wid: '79876543210@c.us', typeInstance: 'telegram' },
  timestamp: 1763115112,
  idMessage: '1763115112345',
  senderData: {
    chatId: '10000000',
    chatType: 'user',
    sender: '10000000',
    chatName: 'Василиса Премудрая',
    senderName: 'Василиса Премудрая',
    senderContactName: 'Василиса Премудрая',
    senderPhoneNumber: 79998887766,
  },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: {
      textMessage: 'Я использую GREEN-API для отправки этого сообщения!',
      forwardingScore: 0,
      isForwarded: false,
    },
  },
};

export const outgoingStatusNotification = {
  typeWebhook: 'outgoingMessageStatus',
  chatId: '10000000',
  instanceData: { idInstance: 3100000000, wid: '79991234567@c.us', typeInstance: 'v3' },
  timestamp: 1755591519,
  idMessage: '115054445839974415',
  status: 'delivered',
};
