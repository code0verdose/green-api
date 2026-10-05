import {
  incomingTextNotification,
  outgoingStatusNotification,
} from '@shared/test/green-api.fixtures';

import { mapNotification } from './map-notification.util';

/** Bodies below follow the examples on green-api.com/v3/docs and /telegram/docs. */
const maxIncoming = {
  typeWebhook: 'incomingMessageReceived',
  instanceData: { idInstance: 310000001, wid: '79991234567@c.us', typeInstance: 'v3' },
  timestamp: 1763115112,
  idMessage: '126543123451133331119',
  senderData: {
    chatId: '10000000',
    chatName: 'Ходабрыш Пробешёлов',
    chatType: 'user',
    sender: '10000000',
    senderName: 'Ходабрыш Пробешёлов',
    senderType: 'user',
    senderContactName: 'Ходабрыш Пробешёлов',
    senderPhoneNumber: 79876543210,
  },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: { textMessage: 'Привет от Green-API!' },
  },
};

const withMessageData = (messageData: unknown, typeWebhook = 'incomingMessageReceived') => ({
  ...maxIncoming,
  typeWebhook,
  messageData,
});

describe('mapNotification', () => {
  describe('messages', () => {
    it('maps an incoming MAX text message', () => {
      expect(mapNotification(maxIncoming)).toEqual({
        type: 'message',
        direction: 'incoming',
        chatId: '10000000',
        chatName: 'Ходабрыш Пробешёлов',
        phone: '79876543210',
        idMessage: '126543123451133331119',
        timestamp: 1763115112000,
        kind: 'text',
        text: 'Привет от Green-API!',
        viaApi: false,
      });
    });

    it('maps an incoming Telegram text message', () => {
      expect(mapNotification(incomingTextNotification)).toMatchObject({
        type: 'message',
        direction: 'incoming',
        chatId: '10000000',
        chatName: 'Василиса Премудрая',
        phone: '79998887766',
        text: 'Я использую GREEN-API для отправки этого сообщения!',
      });
    });

    it('reads the text of an extendedTextMessage (a link or email)', () => {
      const body = withMessageData({
        typeMessage: 'extendedTextMessage',
        extendedTextMessageData: {
          text: 'Документация на сайте https://green-api.com/',
          description: 'Сервис GREEN-API',
          title: 'MAX API',
        },
      });

      expect(mapNotification(body)).toMatchObject({
        kind: 'text',
        text: 'Документация на сайте https://green-api.com/',
      });
    });

    it('prefers the contact name, then the chat name, then the sender name', () => {
      const body = {
        ...maxIncoming,
        senderData: {
          ...maxIncoming.senderData,
          senderContactName: '',
          chatName: '',
          senderName: 'Вася',
        },
      };

      expect(mapNotification(body)).toMatchObject({ chatName: 'Вася' });
    });

    it('leaves the name and phone empty when the notification has none', () => {
      const body = {
        ...maxIncoming,
        senderData: { chatId: '10000000', sender: '10000000', senderPhoneNumber: 0 },
      };

      expect(mapNotification(body)).toMatchObject({ chatName: null, phone: null });
    });

    it.each([
      ['outgoingMessageReceived', 'sent from the phone'],
      ['outgoingAPIMessageReceived', 'sent through the API'],
    ])('maps %s (%s) as outgoing without taking our own phone', (typeWebhook) => {
      const event = mapNotification({ ...maxIncoming, typeWebhook });

      expect(event).toMatchObject({
        type: 'message',
        direction: 'outgoing',
        phone: null,
        viaApi: typeWebhook === 'outgoingAPIMessageReceived',
      });
      expect(event).toMatchObject({ chatName: 'Ходабрыш Пробешёлов' });
    });

    it.each([
      ['imageMessage', 'Фото'],
      ['videoMessage', 'Видео'],
      ['documentMessage', 'Документ'],
      ['audioMessage', 'Аудио'],
      ['stickerMessage', 'Стикер'],
      ['locationMessage', 'Геопозиция'],
      ['contactMessage', 'Контакт'],
      ['pollMessage', 'Опрос'],
      ['someFutureMessage', 'Сообщение'],
    ])('shows %s as an unsupported placeholder', (typeMessage, label) => {
      const event = mapNotification(withMessageData({ typeMessage }));

      expect(event).toMatchObject({ type: 'message', kind: 'unsupported' });
      expect(event).toHaveProperty('text', expect.stringContaining(label) as string);
    });

    it.each(['reactionMessage', 'deletedMessage', 'editedMessage'])(
      'ignores %s — it is not a new message',
      (typeMessage) => {
        expect(mapNotification(withMessageData({ typeMessage }))).toMatchObject({
          type: 'ignored',
        });
      },
    );

    it.each([
      ['a group chatType', { chatType: 'group' }],
      ['a supergroup chatType', { chatType: 'supergroup' }],
      ['a negative group chatId', { chatId: '-10000000000000', chatType: undefined }],
    ])('ignores messages from %s', (_case, senderData) => {
      const body = { ...maxIncoming, senderData: { ...maxIncoming.senderData, ...senderData } };

      expect(mapNotification(body)).toMatchObject({ type: 'ignored', reason: 'group chat' });
    });
  });

  describe('statuses', () => {
    it.each(['sent', 'delivered', 'read'] as const)('maps "%s"', (status) => {
      expect(mapNotification({ ...outgoingStatusNotification, status })).toEqual({
        type: 'status',
        chatId: '10000000',
        idMessage: '115054445839974415',
        status,
        reason: null,
      });
    });

    it.each([
      ['noAccount', undefined, /Получатель не найден/],
      ['notInGroup', undefined, /не участник/],
      ['failed', 'chatId unresolvable on this session', /создайте чат заново/i],
      ['failed', 'media caption too long', /media caption too long/],
      ['failed', undefined, /не принял сообщение/],
    ])('maps "%s" (%s) to failed with a reason', (status, description, reason) => {
      const event = mapNotification({ ...outgoingStatusNotification, status, description });

      expect(event).toMatchObject({ type: 'status', status: 'failed' });
      expect(event).toHaveProperty('reason', expect.stringMatching(reason) as string);
    });

    it('ignores a status this app does not track', () => {
      expect(
        mapNotification({ ...outgoingStatusNotification, status: 'yellowCard' }),
      ).toMatchObject({ type: 'ignored' });
    });
  });

  describe('instance', () => {
    it('maps stateInstanceChanged', () => {
      expect(
        mapNotification({
          typeWebhook: 'stateInstanceChanged',
          instanceData: { idInstance: 3100000000, wid: '79991234567@c.us', typeInstance: 'v3' },
          timestamp: 1763115112,
          stateInstance: 'notAuthorized',
        }),
      ).toEqual({ type: 'instance-state', state: 'notAuthorized' });
    });

    it('maps quotaExceeded with the server description', () => {
      expect(
        mapNotification({
          typeWebhook: 'quotaExceeded',
          timestamp: 1763115112,
          quotaData: {
            method: 'correspondents',
            used: 3,
            total: 3,
            status: 'CORRESPONDENTS_QUOTA_EXCEEDED',
            description: 'Monthly quota has been exceeded.',
          },
        }),
      ).toEqual({ type: 'quota-exceeded', description: 'Monthly quota has been exceeded.' });
    });

    it('falls back to a generic quota description', () => {
      expect(mapNotification({ typeWebhook: 'quotaExceeded', quotaData: {} })).toMatchObject({
        type: 'quota-exceeded',
        description: expect.stringMatching(/лимит/) as string,
      });
    });
  });

  describe('malformed input', () => {
    it.each([
      ['null', null],
      ['a string', 'hello'],
      ['no typeWebhook', { foo: 1 }],
      ['an unknown typeWebhook', { typeWebhook: 'incomingCall' }],
      ['a message without senderData', { typeWebhook: 'incomingMessageReceived' }],
      ['a status without idMessage', { typeWebhook: 'outgoingMessageStatus', chatId: '1' }],
      ['a state without stateInstance', { typeWebhook: 'stateInstanceChanged' }],
    ])('ignores %s instead of throwing', (_case, body) => {
      expect(mapNotification(body)).toMatchObject({ type: 'ignored' });
    });
  });
});
