import type { ChatsData, ReceivedMessageInput } from '../types/chat.types';
import {
  addPendingMessage,
  applyStatus,
  EMPTY_CHATS,
  markChatRead,
  markMessageFailed,
  markMessageSent,
  openChat,
  receiveMessage,
  retryMessage,
} from './chat-reducers.util';

const T0 = Date.UTC(2026, 9, 5, 12, 0);

const withChat = (data: ChatsData = EMPTY_CHATS) =>
  openChat(data, {
    chatId: '10000000',
    title: '+7 999 123-45-67',
    phone: '79991234567',
    username: null,
    now: T0,
  });

const incoming = (overrides: Partial<ReceivedMessageInput> = {}): ReceivedMessageInput => ({
  direction: 'incoming',
  chatId: '10000000',
  chatName: 'Василиса',
  phone: '79991234567',
  idMessage: 'in-1',
  timestamp: T0 + 1000,
  kind: 'text',
  text: 'Привет',
  localId: 'local-in-1',
  isActive: false,
  viaApi: false,
  ...overrides,
});

const messagesOf = (data: ChatsData, chatId = '10000000') => data.messages[chatId] ?? [];

describe('chat reducers', () => {
  describe('openChat', () => {
    it('creates a chat with an empty feed', () => {
      const data = withChat();

      expect(data.chats['10000000']).toEqual({
        id: '10000000',
        title: '+7 999 123-45-67',
        phone: '79991234567',
        username: null,
        unread: 0,
        lastActivityAt: T0,
      });
      expect(messagesOf(data)).toEqual([]);
    });

    it('returns the same state when the chat already exists', () => {
      const data = withChat();
      expect(withChat(data)).toBe(data);
    });
  });

  describe('receiveMessage', () => {
    it('adds an incoming message, renames the chat and counts it as unread', () => {
      const data = receiveMessage(withChat(), incoming());

      expect(messagesOf(data)).toEqual([
        {
          localId: 'local-in-1',
          idMessage: 'in-1',
          chatId: '10000000',
          direction: 'incoming',
          kind: 'text',
          text: 'Привет',
          timestamp: T0 + 1000,
          status: null,
          error: null,
          rev: 0,
        },
      ]);
      expect(data.chats['10000000']).toMatchObject({
        title: 'Василиса',
        unread: 1,
        lastActivityAt: T0 + 1000,
      });
    });

    it('does not count a message in the open chat as unread', () => {
      const data = receiveMessage(withChat(), incoming({ isActive: true }));
      expect(data.chats['10000000']?.unread).toBe(0);
    });

    it('ignores a redelivered notification with the same idMessage', () => {
      const once = receiveMessage(withChat(), incoming());
      const twice = receiveMessage(once, incoming({ localId: 'another-local-id' }));

      expect(messagesOf(twice)).toHaveLength(1);
      expect(twice.chats['10000000']?.unread).toBe(1);
    });

    it('creates a chat for a message from a new person', () => {
      const data = receiveMessage(EMPTY_CHATS, incoming({ chatId: '20000000', phone: null }));

      expect(data.chats['20000000']).toMatchObject({ title: 'Василиса', unread: 1, phone: null });
    });

    it('names a new chat by phone, then by id, when the sender has no name', () => {
      const byPhone = receiveMessage(
        EMPTY_CHATS,
        incoming({ chatId: '2', chatName: null, phone: '79990000000' }),
      );
      const byId = receiveMessage(
        EMPTY_CHATS,
        incoming({ chatId: '3', chatName: null, phone: null }),
      );

      expect(byPhone.chats['2']?.title).toBe('+7 999 000-00-00');
      expect(byId.chats['3']?.title).toBe('3');
    });

    it('treats a chat id named like an Object.prototype member as an ordinary chat', () => {
      const data = receiveMessage(EMPTY_CHATS, incoming({ chatId: 'constructor', phone: null }));

      expect(Object.hasOwn(data.chats, 'constructor')).toBe(true);
      expect(data.chats.constructor).toMatchObject({ id: 'constructor', unread: 1 });
      expect(messagesOf(data, 'constructor')).toHaveLength(1);
    });

    it('keeps the chat title when the notification has no name', () => {
      const data = receiveMessage(withChat(), incoming({ chatName: null }));
      expect(data.chats['10000000']?.title).toBe('+7 999 123-45-67');
    });

    it('moves a chat with its history to the new chatId when the phone matches', () => {
      const withHistory = addPendingMessage(withChat(), {
        chatId: '10000000',
        localId: 'old',
        text: 'Старое',
        timestamp: T0,
      });

      const data = receiveMessage(withHistory, incoming({ chatId: '99999999' }));

      expect(data.chats['10000000']).toBeUndefined();
      expect(data.messages['10000000']).toBeUndefined();
      expect(data.chats['99999999']).toMatchObject({ phone: '79991234567', title: 'Василиса' });
      // Retry and status lookups use message.chatId, so moved messages must follow the chat.
      expect(messagesOf(data, '99999999').map((message) => message.chatId)).toEqual([
        '99999999',
        '99999999',
      ]);
    });

    it('stores an outgoing message from the phone as sent', () => {
      const data = receiveMessage(
        withChat(),
        incoming({ direction: 'outgoing', idMessage: 'out-1', chatName: null, phone: null }),
      );

      expect(messagesOf(data)[0]).toMatchObject({ direction: 'outgoing', status: 'sent' });
      expect(data.chats['10000000']?.unread).toBe(0);
    });

    it('keeps arrival order: a reply never jumps above the question it answers', () => {
      // Our message carries the browser clock in ms; the reply carries the server clock in
      // whole seconds, so it can look "older". The GREEN-API queue is FIFO — trust arrival.
      const asked = addPendingMessage(withChat(), {
        chatId: '10000000',
        localId: 'question',
        text: 'Вопрос',
        timestamp: T0 + 1500,
      });
      const answered = receiveMessage(
        asked,
        incoming({ idMessage: 'answer', timestamp: T0 + 1000 }),
      );

      expect(messagesOf(answered).map((message) => message.localId)).toEqual([
        'question',
        'local-in-1',
      ]);
      expect(answered.chats['10000000']?.lastActivityAt).toBe(T0 + 1500);
    });

    it('keeps only the latest 500 messages of a chat', () => {
      let data = withChat();
      for (let index = 0; index < 505; index += 1) {
        data = receiveMessage(data, incoming({ idMessage: `m${index}`, timestamp: T0 + index }));
      }

      expect(messagesOf(data)).toHaveLength(500);
      expect(messagesOf(data)[0]?.idMessage).toBe('m5');
    });
  });

  describe('sending', () => {
    const pending = () =>
      addPendingMessage(withChat(), {
        chatId: '10000000',
        localId: 'local-1',
        text: 'Привет!',
        timestamp: T0 + 500,
      });

    it('adds an optimistic pending message', () => {
      expect(messagesOf(pending())[0]).toMatchObject({
        localId: 'local-1',
        idMessage: null,
        direction: 'outgoing',
        status: 'pending',
      });
      expect(pending().chats['10000000']?.lastActivityAt).toBe(T0 + 500);
    });

    it('marks it sent with the idMessage from SendMessage', () => {
      const data = markMessageSent(pending(), {
        chatId: '10000000',
        localId: 'local-1',
        idMessage: 'api-1',
      });

      expect(messagesOf(data)[0]).toMatchObject({ idMessage: 'api-1', status: 'sent' });
    });

    it('merges the API echo that arrived before the SendMessage response', () => {
      const echoed = receiveMessage(
        pending(),
        incoming({ direction: 'outgoing', idMessage: 'api-1', text: 'Привет!', localId: 'echo' }),
      );
      const delivered = applyStatus(echoed, {
        chatId: '10000000',
        idMessage: 'api-1',
        status: 'delivered',
        reason: null,
      });

      const data = markMessageSent(delivered, {
        chatId: '10000000',
        localId: 'local-1',
        idMessage: 'api-1',
      });

      expect(messagesOf(data)).toHaveLength(1);
      expect(messagesOf(data)[0]).toMatchObject({
        localId: 'local-1',
        idMessage: 'api-1',
        status: 'delivered',
      });
    });

    it('adopts the echo of a send whose outcome was unknown instead of adding a duplicate', () => {
      // SendMessage timed out, so the bubble says "failed"; GREEN-API had accepted it after all.
      const timedOut = markMessageFailed(pending(), {
        chatId: '10000000',
        localId: 'local-1',
        error: 'нет ответа',
      });

      const data = receiveMessage(
        timedOut,
        incoming({
          direction: 'outgoing',
          viaApi: true,
          idMessage: 'api-9',
          text: 'Привет!',
          timestamp: T0 + 1000,
          localId: 'echo',
        }),
      );

      expect(messagesOf(data)).toEqual([
        expect.objectContaining({
          localId: 'local-1',
          idMessage: 'api-9',
          status: 'sent',
          error: null,
        }),
      ]);
    });

    it('does not adopt an echo with another text or from long ago', () => {
      const timedOut = markMessageFailed(pending(), {
        chatId: '10000000',
        localId: 'local-1',
        error: 'нет ответа',
      });
      const echo = (text: string, timestamp: number) =>
        incoming({
          direction: 'outgoing',
          viaApi: true,
          idMessage: `api-${text}`,
          text,
          timestamp,
        });

      const otherText = receiveMessage(timedOut, echo('Другой текст', T0 + 1000));
      const tooLate = receiveMessage(timedOut, echo('Привет!', T0 + 60 * 60 * 1000));

      expect(messagesOf(otherText)).toHaveLength(2);
      expect(messagesOf(tooLate)).toHaveLength(2);
    });

    it('leaves a pending bubble to its own SendMessage answer', () => {
      // The echo of a first attempt must not be pinned to a retry still in flight.
      const data = receiveMessage(
        pending(),
        incoming({ direction: 'outgoing', viaApi: true, idMessage: 'api-1', text: 'Привет!' }),
      );

      expect(messagesOf(data).map((message) => message.idMessage)).toEqual([null, 'api-1']);
    });

    it('does not adopt the same text typed on the phone', () => {
      const failed = markMessageFailed(pending(), {
        chatId: '10000000',
        localId: 'local-1',
        error: 'нет ответа',
      });

      const data = receiveMessage(
        failed,
        incoming({ direction: 'outgoing', viaApi: false, idMessage: 'phone-1', text: 'Привет!' }),
      );

      expect(messagesOf(data)).toHaveLength(2);
      expect(messagesOf(data)[0]).toMatchObject({ status: 'failed', idMessage: null });
    });

    it('ignores the API echo once the message is already known', () => {
      const sent = markMessageSent(pending(), {
        chatId: '10000000',
        localId: 'local-1',
        idMessage: 'api-1',
      });
      const data = receiveMessage(
        sent,
        incoming({ direction: 'outgoing', idMessage: 'api-1', localId: 'echo' }),
      );

      expect(messagesOf(data)).toHaveLength(1);
    });

    it('marks a pending message failed and lets it be retried', () => {
      const failed = markMessageFailed(pending(), {
        chatId: '10000000',
        localId: 'local-1',
        error: 'Нет связи',
      });
      expect(messagesOf(failed)[0]).toMatchObject({ status: 'failed', error: 'Нет связи' });

      const retried = retryMessage(failed, { chatId: '10000000', localId: 'local-1' });
      expect(messagesOf(retried)[0]).toMatchObject({ status: 'pending', error: null });
    });

    it('does not mark an already sent message as failed', () => {
      const sent = markMessageSent(pending(), {
        chatId: '10000000',
        localId: 'local-1',
        idMessage: 'api-1',
      });
      const data = markMessageFailed(sent, { chatId: '10000000', localId: 'local-1', error: 'x' });

      expect(messagesOf(data)[0]?.status).toBe('sent');
    });

    it('returns the same state for an unknown local id', () => {
      const data = pending();
      const input = { chatId: '10000000', localId: 'nope' };
      expect(markMessageSent(data, { ...input, idMessage: 'x' })).toBe(data);
      expect(markMessageFailed(data, { ...input, error: 'x' })).toBe(data);
      expect(retryMessage(data, input)).toBe(data);
    });
  });

  describe('applyStatus', () => {
    const sent = () =>
      markMessageSent(
        addPendingMessage(withChat(), {
          chatId: '10000000',
          localId: 'local-1',
          text: 'Привет!',
          timestamp: T0,
        }),
        { chatId: '10000000', localId: 'local-1', idMessage: 'api-1' },
      );
    const status = (data: ChatsData, value: 'sent' | 'delivered' | 'read' | 'failed') =>
      applyStatus(data, {
        chatId: '10000000',
        idMessage: 'api-1',
        status: value,
        reason: value === 'failed' ? 'Получатель не найден' : null,
      });

    it('moves forward: sent → delivered → read', () => {
      expect(messagesOf(status(sent(), 'delivered'))[0]?.status).toBe('delivered');
      expect(messagesOf(status(status(sent(), 'delivered'), 'read'))[0]?.status).toBe('read');
    });

    it('never moves back when statuses arrive out of order', () => {
      const data = status(status(sent(), 'read'), 'delivered');
      expect(messagesOf(data)[0]?.status).toBe('read');
    });

    it('marks failed with the reason', () => {
      expect(messagesOf(status(sent(), 'failed'))[0]).toMatchObject({
        status: 'failed',
        error: 'Получатель не найден',
      });
    });

    it('does not fail a message that was already delivered', () => {
      expect(messagesOf(status(status(sent(), 'delivered'), 'failed'))[0]?.status).toBe(
        'delivered',
      );
    });

    it('recovers a failed message that turns out delivered', () => {
      expect(messagesOf(status(status(sent(), 'failed'), 'delivered'))[0]).toMatchObject({
        status: 'delivered',
        error: null,
      });
    });

    it('finds the message even if the status names another chatId', () => {
      const data = applyStatus(sent(), {
        chatId: '79991234567@c.us',
        idMessage: 'api-1',
        status: 'read',
        reason: null,
      });
      expect(messagesOf(data)[0]?.status).toBe('read');
    });

    it('ignores a status for an unknown message', () => {
      const data = sent();
      expect(
        applyStatus(data, { chatId: '1', idMessage: 'nope', status: 'read', reason: null }),
      ).toBe(data);
    });
  });

  describe('rev — the cross-tab tie-breaker', () => {
    const revOf = (data: ChatsData) => messagesOf(data)[0]?.rev;
    const ref = { chatId: '10000000', localId: 'local-1' };
    const pending = () =>
      addPendingMessage(withChat(), { ...ref, text: 'Привет!', timestamp: T0 + 500 });
    const failed = () => markMessageFailed(pending(), { ...ref, error: 'Нет связи' });
    const sent = () => markMessageSent(pending(), { ...ref, idMessage: 'api-1' });

    it('starts new messages at zero', () => {
      expect(revOf(pending())).toBe(0);
      expect(revOf(receiveMessage(withChat(), incoming()))).toBe(0);
    });

    it('bumps it on every status change this client makes', () => {
      expect(revOf(failed())).toBe(1);
      expect(revOf(retryMessage(failed(), ref))).toBe(2);
      expect(revOf(sent())).toBe(1);
      expect(
        revOf(
          applyStatus(sent(), {
            chatId: '10000000',
            idMessage: 'api-1',
            status: 'delivered',
            reason: null,
          }),
        ),
      ).toBe(2);
      expect(
        revOf(
          receiveMessage(
            failed(),
            incoming({ direction: 'outgoing', idMessage: 'api-1', text: 'Привет!', viaApi: true }),
          ),
        ),
      ).toBe(2);
    });

    it('leaves it alone when the status does not change', () => {
      const data = sent();
      expect(
        applyStatus(data, { chatId: '10000000', idMessage: 'api-1', status: 'sent', reason: null }),
      ).toBe(data);
    });
  });

  describe('markChatRead', () => {
    it('resets the unread counter', () => {
      const data = markChatRead(receiveMessage(withChat(), incoming()), '10000000');
      expect(data.chats['10000000']?.unread).toBe(0);
    });

    it('returns the same state when there is nothing to reset', () => {
      const data = withChat();
      expect(markChatRead(data, '10000000')).toBe(data);
      expect(markChatRead(data, 'unknown')).toBe(data);
    });
  });
});
