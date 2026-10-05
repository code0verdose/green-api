import { notifications } from '@mantine/notifications';

import { mergeChatsData } from '../../lib/merge-chats-data.util';
import { CHAT_STORAGE_KEY, STORAGE_PROBLEM_TEXT } from '../../model/constants/chat-store.constant';
import type { ChatsData } from '../../types/chat.types';
import {
  activateChatOwner,
  detachChatHistory,
  forgetChatHistory,
  syncChatStoreAcrossTabs,
  useChatStore,
} from './chat.store';

const T0 = Date.UTC(2026, 9, 5, 12, 0);
const MAX = 'max:3100000001';
const TELEGRAM = 'telegram:4100000001';

const keyOf = (owner: string) => `${CHAT_STORAGE_KEY}:${owner}`;
const stored = (owner: string) =>
  JSON.parse(localStorage.getItem(keyOf(owner)) ?? 'null') as {
    state: { chats: Record<string, unknown>; messages: Record<string, unknown[]> };
  } | null;

const openChat = (chatId: string) =>
  useChatStore.getState().openChat({ chatId, title: chatId, phone: null, username: null, now: T0 });

const incoming = (chatId: string, idMessage: string) =>
  useChatStore.getState().receiveMessage({
    direction: 'incoming',
    chatId,
    chatName: null,
    phone: null,
    idMessage,
    timestamp: T0,
    kind: 'text',
    text: idMessage,
    localId: `local-${idMessage}`,
    isActive: false,
    viaApi: false,
  });

describe('useChatStore', () => {
  afterEach(() => detachChatHistory());

  it('stores each instance under its own key and keeps the actions out of storage', () => {
    activateChatOwner(MAX);
    openChat('10000000');

    expect(useChatStore.getState().owner).toBe(MAX);
    expect(stored(MAX)?.state).toEqual({
      chats: {
        '10000000': {
          id: '10000000',
          title: '10000000',
          phone: null,
          username: null,
          unread: 0,
          lastActivityAt: T0,
        },
      },
      messages: { '10000000': [] },
    });
  });

  it('never touches the history of another instance (two tabs, two messengers)', () => {
    activateChatOwner(MAX);
    openChat('max-chat');

    // Another tab signs in to Telegram: same storage, different owner.
    activateChatOwner(TELEGRAM);
    openChat('telegram-chat');

    expect(Object.keys(useChatStore.getState().chats)).toEqual(['telegram-chat']);
    expect(Object.keys(stored(MAX)?.state.chats ?? {})).toEqual(['max-chat']);
    expect(Object.keys(stored(TELEGRAM)?.state.chats ?? {})).toEqual(['telegram-chat']);

    activateChatOwner(MAX);
    expect(Object.keys(useChatStore.getState().chats)).toEqual(['max-chat']);
  });

  it('starts empty for an instance without history', () => {
    activateChatOwner(TELEGRAM);

    expect(useChatStore.getState()).toMatchObject({ owner: TELEGRAM, chats: {}, messages: {} });
    expect(stored(TELEGRAM)).toBeNull();
  });

  it('wires every action to its reducer', () => {
    activateChatOwner(MAX);
    const store = useChatStore.getState();
    openChat('c');
    store.addPendingMessage({ chatId: 'c', localId: 'l1', text: 'a', timestamp: T0 });
    store.markMessageFailed({ chatId: 'c', localId: 'l1', error: 'нет сети' });
    store.retryMessage({ chatId: 'c', localId: 'l1' });
    store.markMessageSent({ chatId: 'c', localId: 'l1', idMessage: 'id1' });
    store.applyStatus({ chatId: 'c', idMessage: 'id1', status: 'read', reason: null });
    incoming('c', 'in1');
    expect(useChatStore.getState().chats.c?.unread).toBe(1);
    store.markChatRead('c');

    const state = useChatStore.getState();
    expect(state.chats.c?.unread).toBe(0);
    expect(state.messages.c?.map((message) => [message.idMessage, message.status])).toEqual([
      ['id1', 'read'],
      ['in1', null],
    ]);
  });

  describe('sign-out', () => {
    it('detaching keeps the stored history for the next sign-in', () => {
      activateChatOwner(MAX);
      openChat('c');

      detachChatHistory();

      expect(useChatStore.getState()).toMatchObject({ owner: null, chats: {} });
      expect(stored(MAX)?.state.chats).toHaveProperty('c');
    });

    it('forgetting wipes the history of this instance only', () => {
      activateChatOwner(TELEGRAM);
      openChat('t');
      activateChatOwner(MAX);
      openChat('m');

      forgetChatHistory();

      expect(stored(MAX)).toBeNull();
      expect(stored(TELEGRAM)?.state.chats).toHaveProperty('t');
      expect(useChatStore.getState().chats).toEqual({});
    });

    it('signs out even when the browser blocks storage', () => {
      activateChatOwner(MAX);
      openChat('c');
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      });
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => forgetChatHistory()).not.toThrow();
      expect(useChatStore.getState()).toMatchObject({ owner: null, chats: {} });
    });

    it('ignores writes while no instance is active', () => {
      openChat('orphan');

      expect(Object.keys(localStorage).filter((key) => key.startsWith(CHAT_STORAGE_KEY))).toEqual(
        [],
      );
    });
  });

  describe('cross-tab sync', () => {
    it('merges what another tab stored instead of replacing this tab history', async () => {
      activateChatOwner(MAX);
      openChat('c');
      incoming('c', 'received-here');
      const stop = syncChatStoreAcrossTabs();

      try {
        // The other tab wrote its blob without our message but with its own pending one.
        localStorage.setItem(
          keyOf(MAX),
          JSON.stringify({
            version: 1,
            state: {
              chats: {
                c: {
                  id: 'c',
                  title: 'c',
                  phone: null,
                  username: null,
                  unread: 0,
                  lastActivityAt: T0,
                },
              },
              messages: {
                c: [
                  {
                    localId: 'other-tab',
                    idMessage: null,
                    chatId: 'c',
                    direction: 'outgoing',
                    kind: 'text',
                    text: 'из другой вкладки',
                    timestamp: T0,
                    status: 'pending',
                    error: null,
                  },
                ],
              },
            },
          }),
        );
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: keyOf(MAX),
            newValue: localStorage.getItem(keyOf(MAX)),
          }),
        );
        await Promise.resolve();

        expect(useChatStore.getState().messages.c?.map((message) => message.localId)).toEqual([
          'other-tab',
          'local-received-here',
        ]);
        // A pending send of a live tab is not mistaken for one interrupted by a closed page.
        expect(useChatStore.getState().messages.c?.[0]?.status).toBe('pending');
        // ...and the united history is written back, so a reload of this tab keeps 'received-here'.
        await vi.waitFor(() =>
          expect(
            stored(MAX)?.state.messages.c?.map(
              (message) => (message as { localId: string }).localId,
            ),
          ).toEqual(['other-tab', 'local-received-here']),
        );
      } finally {
        stop();
      }
    });

    it('does not write back when the stored history already holds everything', async () => {
      activateChatOwner(MAX);
      openChat('c');
      const stop = syncChatStoreAcrossTabs();
      const setItem = vi.spyOn(Storage.prototype, 'setItem');

      try {
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: keyOf(MAX),
            newValue: localStorage.getItem(keyOf(MAX)),
          }),
        );
        await Promise.resolve();
        await Promise.resolve();

        expect(setItem).not.toHaveBeenCalled();
      } finally {
        stop();
      }
    });

    it('settles after one write-back when each tab has a chat the other lacks', async () => {
      // Telegram chat ids exceed 2^32: object keys keep insertion order, not numeric order.
      const chatRecord = (id: string) => ({
        id,
        title: id,
        phone: null,
        username: null,
        unread: 0,
        lastActivityAt: T0,
      });
      const otherTab: ChatsData = {
        owner: TELEGRAM,
        chats: { '6000000001': chatRecord('6000000001') },
        messages: { '6000000001': [] },
      };
      const publish = (data: Pick<ChatsData, 'chats' | 'messages'>) => {
        localStorage.setItem(
          keyOf(TELEGRAM),
          JSON.stringify({ version: 1, state: { chats: data.chats, messages: data.messages } }),
        );
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: keyOf(TELEGRAM),
            newValue: localStorage.getItem(keyOf(TELEGRAM)),
          }),
        );
      };
      activateChatOwner(TELEGRAM);
      openChat('6000000002');
      const stop = syncChatStoreAcrossTabs();

      try {
        publish(otherTab);
        await vi.waitFor(() =>
          expect(Object.keys(stored(TELEGRAM)?.state.chats ?? {})).toHaveLength(2),
        );
        // The other tab unites our write-back with its own history and stores the result.
        const union = stored(TELEGRAM)?.state as Pick<ChatsData, 'chats' | 'messages'>;
        const setItem = vi.spyOn(Storage.prototype, 'setItem');
        publish(mergeChatsData(otherTab, { owner: TELEGRAM, ...union }));
        setItem.mockClear();
        await Promise.resolve();
        await Promise.resolve();

        expect(setItem).not.toHaveBeenCalled();
      } finally {
        stop();
      }
    });

    it('does not let another tab knock a retry back to failed', async () => {
      const ref = { chatId: 'c', localId: 'l1' };
      activateChatOwner(MAX);
      openChat('c');
      const actions = useChatStore.getState();
      actions.addPendingMessage({ ...ref, text: 'Привет', timestamp: T0 });
      actions.markMessageFailed({ ...ref, error: 'Нет связи' });
      // What a second tab holds: the failed bubble, before the user pressed "retry" here.
      const failedCopy = localStorage.getItem(keyOf(MAX)) ?? '';
      actions.retryMessage(ref);
      const stop = syncChatStoreAcrossTabs();

      try {
        localStorage.setItem(keyOf(MAX), failedCopy);
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: keyOf(MAX),
            newValue: localStorage.getItem(keyOf(MAX)),
          }),
        );
        await Promise.resolve();

        expect(useChatStore.getState().messages.c?.[0]).toMatchObject({
          status: 'pending',
          error: null,
        });
      } finally {
        stop();
      }
    });

    const flush = async () => {
      await Promise.resolve();
      await Promise.resolve();
    };
    const announce = (value: string | null) => {
      if (value === null) localStorage.removeItem(keyOf(MAX));
      else localStorage.setItem(keyOf(MAX), value);
      window.dispatchEvent(new StorageEvent('storage', { key: keyOf(MAX), newValue: value }));
    };
    /** The stored blob with chat `c` holding exactly these incoming messages. */
    const blobWith = (idMessages: string[]) => {
      const blob = JSON.parse(localStorage.getItem(keyOf(MAX)) ?? '{}') as {
        state: { messages: Record<string, unknown[]> };
      };
      blob.state.messages.c = idMessages.map((idMessage) => ({
        localId: `local-${idMessage}`,
        idMessage,
        chatId: 'c',
        direction: 'incoming',
        kind: 'text',
        text: idMessage,
        timestamp: T0,
        status: null,
        error: null,
        rev: 0,
      }));
      return JSON.stringify(blob);
    };

    it('settles at the 500-message cap without returning what the other tab dropped', async () => {
      activateChatOwner(MAX);
      openChat('c');
      for (let index = 1; index <= 500; index += 1) incoming('c', `m${index}`);
      const otherTab = blobWith(Array.from({ length: 500 }, (_, index) => `m${index + 2}`));
      const stop = syncChatStoreAcrossTabs();
      const setItem = vi.spyOn(Storage.prototype, 'setItem');

      try {
        announce(otherTab);
        setItem.mockClear();
        await flush();

        expect(setItem).not.toHaveBeenCalled();
        const ids = useChatStore.getState().messages.c?.map((message) => message.idMessage);
        expect([ids?.[0], ids?.at(-1), ids?.length]).toEqual(['m2', 'm501', 500]);
      } finally {
        stop();
      }
    });

    it('writes back at most once until this tab changes something itself', async () => {
      activateChatOwner(MAX);
      openChat('c');
      incoming('c', 'shared');
      incoming('c', 'only-here');
      // A tab that keeps writing a history without our message (e.g. an older build).
      const stale = blobWith(['shared']);
      const stop = syncChatStoreAcrossTabs();
      const setItem = vi.spyOn(Storage.prototype, 'setItem');

      try {
        announce(stale);
        await vi.waitFor(() => expect(localStorage.getItem(keyOf(MAX))).toContain('only-here'));
        announce(stale);
        setItem.mockClear();
        await flush();
        expect(setItem).not.toHaveBeenCalled();

        // An own change re-arms it: the next stale write is answered again.
        incoming('c', 'new-here');
        announce(stale);
        await vi.waitFor(() => expect(localStorage.getItem(keyOf(MAX))).toContain('new-here'));
      } finally {
        stop();
      }
    });

    it('starts every instance with the write-back armed', async () => {
      activateChatOwner(MAX);
      openChat('c');
      incoming('c', 'only-here');
      const stale = blobWith([]);
      const stop = syncChatStoreAcrossTabs();

      try {
        announce(stale);
        await vi.waitFor(() => expect(localStorage.getItem(keyOf(MAX))).toContain('only-here'));
        // The write-back of MAX is spent; Telegram's first load turns a dead send into "failed".
        const pendingSend = {
          localId: 'l1',
          idMessage: null,
          chatId: 'c',
          direction: 'outgoing',
          kind: 'text',
          text: 'Привет',
          timestamp: T0,
          status: 'pending',
          error: null,
          rev: 0,
        };
        const telegramBlob = JSON.stringify({
          version: 1,
          state: {
            chats: {
              c: {
                id: 'c',
                title: 'c',
                phone: null,
                username: null,
                unread: 0,
                lastActivityAt: T0,
              },
            },
            messages: { c: [pendingSend] },
          },
        });
        localStorage.setItem(keyOf(TELEGRAM), telegramBlob);
        detachChatHistory();
        activateChatOwner(TELEGRAM);

        window.dispatchEvent(
          new StorageEvent('storage', { key: keyOf(TELEGRAM), newValue: telegramBlob }),
        );

        await vi.waitFor(() =>
          expect(stored(TELEGRAM)?.state.messages.c?.[0]).toMatchObject({ status: 'failed' }),
        );
      } finally {
        stop();
      }
    });

    it('leaves the removal of the history to the sign-out signal', async () => {
      activateChatOwner(MAX);
      openChat('c');
      incoming('c', 'kept-in-memory');
      const stop = syncChatStoreAcrossTabs();
      const setItem = vi.spyOn(Storage.prototype, 'setItem');

      try {
        announce(null);
        await flush();

        expect(setItem).not.toHaveBeenCalled();
        expect(useChatStore.getState().messages.c).toHaveLength(1);
      } finally {
        stop();
      }
    });

    it('ignores the keys of other instances and stops listening on cleanup', async () => {
      activateChatOwner(MAX);
      const rehydrate = vi.spyOn(useChatStore.persist, 'rehydrate');
      const stop = syncChatStoreAcrossTabs();

      window.dispatchEvent(new StorageEvent('storage', { key: keyOf(TELEGRAM), newValue: '{}' }));
      stop();
      window.dispatchEvent(new StorageEvent('storage', { key: keyOf(MAX), newValue: '{}' }));
      await Promise.resolve();

      expect(rehydrate).not.toHaveBeenCalled();
    });
  });

  describe('damaged storage', () => {
    const seed = (owner: string, state: unknown) =>
      localStorage.setItem(keyOf(owner), JSON.stringify({ version: 1, state }));

    it('drops only the broken entries, not the whole history', () => {
      seed(MAX, {
        chats: {
          ok: { id: 'ok', title: 'ok', phone: null, username: null, unread: 0, lastActivityAt: T0 },
          broken: { id: 'broken' },
        },
        messages: {
          ok: [
            {
              localId: 'good',
              idMessage: 'g',
              chatId: 'ok',
              direction: 'incoming',
              kind: 'text',
              text: 'уцелело',
              timestamp: T0,
              status: null,
              error: null,
            },
            { localId: 'bad', text: 42 },
          ],
        },
      });

      activateChatOwner(MAX);

      const state = useChatStore.getState();
      expect(Object.keys(state.chats)).toEqual(['ok']);
      expect(state.messages.ok?.map((message) => message.localId)).toEqual(['good']);
    });

    it('treats an unreadable value as an empty history', () => {
      seed(MAX, { chats: 42 });

      activateChatOwner(MAX);

      expect(useChatStore.getState()).toMatchObject({ owner: MAX, chats: {}, messages: {} });
    });

    it('fails sends that a closed page left pending, so the user can retry them', () => {
      seed(MAX, {
        chats: {
          c: { id: 'c', title: 'c', phone: null, username: null, unread: 0, lastActivityAt: T0 },
        },
        messages: {
          c: [
            {
              localId: 'l1',
              idMessage: null,
              chatId: 'c',
              direction: 'outgoing',
              kind: 'text',
              text: 'Привет',
              timestamp: T0,
              status: 'pending',
              error: null,
            },
          ],
        },
      });

      activateChatOwner(MAX);

      expect(useChatStore.getState().messages.c?.[0]).toMatchObject({ status: 'failed' });
    });
  });

  describe('full storage', () => {
    afterEach(() => {
      vi.restoreAllMocks();
      notifications.clean();
    });

    const quotaError = () => new DOMException('The quota has been exceeded.', 'QuotaExceededError');

    it('trims old messages and writes again when localStorage is full', () => {
      activateChatOwner(MAX);
      openChat('c');
      for (let index = 0; index < 150; index += 1) incoming('c', `m${index}`);
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      setItem.mockImplementationOnce(() => {
        throw quotaError();
      });
      const show = vi.spyOn(notifications, 'show').mockReturnValue('id');
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      incoming('c', 'newest');

      const saved = stored(MAX)?.state.messages.c ?? [];
      expect(saved).toHaveLength(100);
      expect(saved.at(-1)).toMatchObject({ idMessage: 'newest' });
      expect(show).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'storage-trimmed',
          color: 'red',
          message: STORAGE_PROBLEM_TEXT.trimmed,
        }),
      );
      expect(warn).toHaveBeenCalledWith(expect.any(String), expect.any(DOMException));
    });

    it('still warns when even the trimmed history stops fitting later', () => {
      activateChatOwner(MAX);
      openChat('c');
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      setItem.mockImplementationOnce(() => {
        throw quotaError();
      });
      const show = vi.spyOn(notifications, 'show').mockReturnValue('id');
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      incoming('c', 'trimmed');
      setItem.mockImplementation(() => {
        throw quotaError();
      });

      incoming('c', 'lost');
      incoming('c', 'lost-again');

      expect(show.mock.calls.map(([data]) => [data.id, data.message])).toEqual([
        ['storage-trimmed', STORAGE_PROBLEM_TEXT.trimmed],
        ['storage-full', STORAGE_PROBLEM_TEXT.full],
      ]);
    });

    it('trims before every later write instead of failing on the full history again', () => {
      activateChatOwner(TELEGRAM);
      openChat('c');
      for (let index = 0; index < 150; index += 1) incoming('c', `m${index}`);
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      setItem.mockImplementationOnce(() => {
        throw quotaError();
      });
      vi.spyOn(notifications, 'show').mockReturnValue('id');
      incoming('c', 'first-after-quota');
      setItem.mockClear();

      incoming('c', 'second-after-quota');

      expect(setItem).toHaveBeenCalledTimes(1);
      const saved = stored(TELEGRAM)?.state.messages.c ?? [];
      expect(saved).toHaveLength(100);
      expect(saved.at(-1)).toMatchObject({ idMessage: 'second-after-quota' });
    });

    it('names a blocked storage as blocked even when it appears on the trimmed attempt', () => {
      activateChatOwner(MAX);
      openChat('c');
      const setItem = vi.spyOn(Storage.prototype, 'setItem');
      setItem
        .mockImplementationOnce(() => {
          throw quotaError();
        })
        .mockImplementationOnce(() => {
          throw new DOMException('denied', 'SecurityError');
        });
      const show = vi.spyOn(notifications, 'show').mockReturnValue('id');
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      incoming('c', 'm');

      expect(show.mock.calls.map(([data]) => data.id)).toEqual(['storage-blocked']);
    });

    it('keeps working in memory when even the trimmed history does not fit', () => {
      activateChatOwner(MAX);
      openChat('c');
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw quotaError();
      });
      vi.spyOn(notifications, 'show').mockReturnValue('id');
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => incoming('c', 'still-shown')).not.toThrow();
      incoming('c', 'also-shown');

      expect(useChatStore.getState().messages.c?.at(-1)?.idMessage).toBe('also-shown');
      // One line per kind of problem, not one per failed write.
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('keeps working when the browser blocks storage altogether', () => {
      activateChatOwner(MAX);
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('denied', 'SecurityError');
      });
      const show = vi.spyOn(notifications, 'show').mockReturnValue('id');
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => openChat('c')).not.toThrow();
      expect(useChatStore.getState().chats).toHaveProperty('c');
      expect(show).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'storage-blocked', message: STORAGE_PROBLEM_TEXT.blocked }),
      );
    });
  });
});
