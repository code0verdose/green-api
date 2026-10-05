import type { Chat, ChatsData, Message } from '../types/chat.types';
import { addsToStored, mergeChatsData } from './merge-chats-data.util';

const T0 = Date.UTC(2026, 9, 5, 12, 0);

const chat = (id: string, extra: Partial<Chat> = {}): Chat => ({
  id,
  title: id,
  phone: null,
  username: null,
  unread: 0,
  lastActivityAt: T0,
  ...extra,
});

const message = (localId: string, extra: Partial<Message> = {}): Message => ({
  localId,
  idMessage: localId,
  chatId: 'c',
  direction: 'incoming',
  kind: 'text',
  text: localId,
  timestamp: T0,
  status: null,
  error: null,
  rev: 0,
  ...extra,
});

const data = (messages: Message[], chats: Chat[] = [chat('c')]): ChatsData => ({
  owner: 'max:1',
  chats: Object.fromEntries(chats.map((item) => [item.id, item])),
  messages: { c: messages },
});

const ids = (merged: ChatsData) => merged.messages.c?.map((item) => item.localId);

/** What a tab writes to localStorage and compares before writing back. */
const persisted = ({ chats, messages }: ChatsData) => JSON.stringify([chats, messages]);

describe('mergeChatsData', () => {
  it('keeps a message this tab received but another tab overwrote', () => {
    // The leader tab just stored an incoming reply; a standby tab wrote its older blob over it.
    const local = data([message('question'), message('reply')]);
    const stored = data([message('question'), message('pending', { direction: 'outgoing' })]);

    expect(ids(mergeChatsData(local, stored))).toEqual(['question', 'pending', 'reply']);
  });

  it('does not duplicate a message known by idMessage under another localId', () => {
    const local = data([message('local-a', { idMessage: 'api-1' })]);
    const stored = data([message('local-b', { idMessage: 'api-1' })]);

    expect(ids(mergeChatsData(local, stored))).toEqual(['local-b']);
  });

  it('keeps the most advanced status of the same message', () => {
    const local = data([message('m', { direction: 'outgoing', status: 'read' })]);
    const stored = data([message('m', { direction: 'outgoing', status: 'delivered' })]);

    expect(mergeChatsData(local, stored).messages.c?.[0]?.status).toBe('read');
  });

  it('takes the stored version of a message when it is at least as advanced', () => {
    const local = data([message('m', { direction: 'outgoing', status: 'pending' })]);
    const stored = data([
      message('m', { direction: 'outgoing', status: 'sent', idMessage: 'api-1' }),
    ]);

    expect(mergeChatsData(local, stored).messages.c?.[0]).toMatchObject({
      status: 'sent',
      idMessage: 'api-1',
    });
  });

  it('unites the chats of both tabs, preferring the stored fields and the latest activity', () => {
    const local = data(
      [],
      [chat('c', { unread: 2, lastActivityAt: T0 + 5000 }), chat('local-only')],
    );
    const stored = data([], [chat('c', { unread: 0, title: 'Вася' }), chat('stored-only')]);

    const merged = mergeChatsData(local, stored);

    expect(Object.keys(merged.chats).sort()).toEqual(['c', 'local-only', 'stored-only']);
    expect(merged.chats.c).toMatchObject({ unread: 0, title: 'Вася', lastActivityAt: T0 + 5000 });
  });

  it('keeps the stored owner and the cap of 500 messages per chat', () => {
    const local = data(Array.from({ length: 300 }, (_, index) => message(`l${index}`)));
    const stored = data(Array.from({ length: 300 }, (_, index) => message(`s${index}`)));

    const merged = mergeChatsData(local, stored);

    expect(merged.messages.c).toHaveLength(500);
    expect(merged.messages.c?.at(-1)?.localId).toBe('l299');
    expect(merged.owner).toBe('max:1');
  });

  describe('between two tabs', () => {
    // Telegram ids exceed 2^32, so JS keeps their insertion order instead of sorting them.
    const LARGE_A = '6000000001';
    const LARGE_B = '6000000002';
    const tab = (...chatIds: string[]): ChatsData => ({
      owner: 'telegram:1',
      chats: Object.fromEntries(chatIds.map((id) => [id, chat(id)])),
      messages: Object.fromEntries(chatIds.map((id) => [id, []])),
    });

    it('settles in one exchange when each tab has a chat the other lacks', () => {
      const first = tab(LARGE_A);
      const second = tab(LARGE_B);

      // The second tab merges what the first stored and writes the union back...
      const union = mergeChatsData(second, first);
      expect(persisted(union)).not.toBe(persisted(first));
      // ...and the first tab, having nothing new, finds it identical: no write, no ping-pong.
      expect(persisted(mergeChatsData(first, union))).toBe(persisted(union));
    });

    it('keeps the stored order of chats, so an unchanged history compares equal', () => {
      const local = tab(LARGE_B, LARGE_A);
      const stored = tab(LARGE_A, LARGE_B);

      expect(persisted(mergeChatsData(local, stored))).toBe(persisted(stored));
    });

    it('lets a retry in this tab beat the failed copy another tab still holds', () => {
      const local = data([message('m', { direction: 'outgoing', status: 'pending', rev: 2 })]);
      const stored = data([message('m', { direction: 'outgoing', status: 'failed', rev: 1 })]);

      expect(mergeChatsData(local, stored).messages.c?.[0]).toMatchObject({
        status: 'pending',
        rev: 2,
      });
    });

    it('lets the failed state of an interrupted send beat its stale pending copy', () => {
      // A tab that loaded while the sending page was alive still holds the pending original.
      const local = data([message('m', { direction: 'outgoing', status: 'pending', rev: 0 })]);
      const stored = data([message('m', { direction: 'outgoing', status: 'failed', rev: 1 })]);

      expect(mergeChatsData(local, stored).messages.c?.[0]?.status).toBe('failed');
    });

    it('keeps one bubble when the sender tab meets the API echo the polling tab received', () => {
      // The polling tab got the echo before the sender tab got its SendMessage answer.
      const stored = data([
        message('mine', { direction: 'outgoing', idMessage: null, status: 'pending' }),
        message('echo', { direction: 'outgoing', idMessage: 'api-1', status: 'sent' }),
      ]);
      const local = data([
        message('mine', { direction: 'outgoing', idMessage: 'api-1', status: 'sent', rev: 1 }),
      ]);

      expect(ids(mergeChatsData(local, stored))).toEqual(['mine']);
    });

    it('keeps the more advanced copy when the echo already got a later status', () => {
      // The polling tab saw "delivered" on its echo; the sender tab only knows "sent".
      const stored = data([
        message('mine', { direction: 'outgoing', idMessage: null, status: 'pending' }),
        message('echo', { direction: 'outgoing', idMessage: 'api-1', status: 'delivered', rev: 1 }),
      ]);
      const local = data([
        message('mine', { direction: 'outgoing', idMessage: 'api-1', status: 'sent', rev: 1 }),
      ]);

      expect(mergeChatsData(local, stored).messages.c).toEqual([
        expect.objectContaining({ idMessage: 'api-1', status: 'delivered' }),
      ]);
    });
  });

  describe('ties and duplicates', () => {
    it('keeps the stored copy when revision and status are equal, so the tabs agree', () => {
      const local = data([message('m', { status: 'failed', error: 'мой текст', rev: 1 })]);
      const stored = data([message('m', { status: 'failed', error: 'их текст', rev: 1 })]);

      const merged = mergeChatsData(local, stored);

      expect(merged.messages.c?.[0]?.error).toBe('их текст');
      expect(addsToStored(merged, stored)).toBe(false);
    });

    it('puts the winner of a duplicate where its first copy stood', () => {
      const stored = data([
        message('mine', { direction: 'outgoing', idMessage: null, status: 'pending' }),
        message('reply'),
        message('echo', { direction: 'outgoing', idMessage: 'api-1', status: 'sent' }),
      ]);
      const local = data([
        message('mine', { direction: 'outgoing', idMessage: 'api-1', status: 'sent', rev: 1 }),
      ]);

      expect(ids(mergeChatsData(local, stored))).toEqual(['mine', 'reply']);
    });

    it('lets the twin with the further status win, whatever its own revision count', () => {
      // The sender copy went failed → retry → sent (rev 3); the echo only got "delivered" (rev 1).
      const stored = data([
        message('echo', { direction: 'outgoing', idMessage: 'api-1', status: 'delivered', rev: 1 }),
      ]);
      const local = data([
        message('mine', { direction: 'outgoing', idMessage: 'api-1', status: 'sent', rev: 3 }),
      ]);

      const merged = mergeChatsData(local, stored);

      // The highest revision travels with the winner, so no stale copy beats it later.
      expect(merged.messages.c).toEqual([
        expect.objectContaining({ localId: 'echo', status: 'delivered', rev: 3 }),
      ]);
      expect(mergeChatsData(local, merged).messages.c).toEqual(merged.messages.c);
    });

    it('treats a twin as the shared point of the window and still compares it', () => {
      const stored = data([
        message('echo', { direction: 'outgoing', idMessage: 'api-1', status: 'delivered', rev: 1 }),
        message('reply'),
      ]);
      const local = data([
        message('dropped-by-the-cap'),
        message('mine', { direction: 'outgoing', idMessage: 'api-1', status: 'read', rev: 2 }),
      ]);

      const merged = mergeChatsData(local, stored);

      expect(ids(merged)).toEqual(['echo', 'reply']);
      expect(merged.messages.c?.[0]?.status).toBe('read');
    });

    it('keeps every message that has no idMessage yet', () => {
      const pending = (localId: string) =>
        message(localId, { direction: 'outgoing', idMessage: null, status: 'pending' });

      expect(ids(mergeChatsData(data([pending('a'), pending('b')]), data([pending('a')])))).toEqual(
        ['a', 'b'],
      );
    });

    it('repairs a duplicate inside one stored history and says so', () => {
      const stored = data([
        message('a', { idMessage: 'api-1' }),
        message('b', { idMessage: 'api-1', status: 'delivered', rev: 1 }),
      ]);

      const merged = mergeChatsData(data([]), stored);

      expect(merged.messages.c).toEqual([
        expect.objectContaining({ localId: 'a', status: 'delivered' }),
      ]);
      expect(addsToStored(merged, stored)).toBe(true);
    });
  });

  describe('the window the other tab keeps', () => {
    const range = (from: number, to: number) =>
      Array.from({ length: to - from + 1 }, (_, index) => message(`m${from + index}`));

    it('does not bring back what the other tab dropped at the 500-message cap', () => {
      const local = data(range(1, 500));
      const stored = data(range(2, 501));

      const merged = mergeChatsData(local, stored);

      expect(ids(merged)).toEqual(ids(stored));
      expect(addsToStored(merged, stored)).toBe(false);
    });

    it('settles on the trimmed window instead of returning older messages', () => {
      const local = data(range(1, 150));
      const stored = data(range(51, 150));

      expect(addsToStored(mergeChatsData(local, stored), stored)).toBe(false);
    });

    it('still adds what this tab has after the shared part', () => {
      const stored = data(range(1, 3));
      const merged = mergeChatsData(data([...range(1, 3), message('fresh')]), stored);

      expect(ids(merged)).toEqual(['m1', 'm2', 'm3', 'fresh']);
      expect(addsToStored(merged, stored)).toBe(true);
    });

    it('keeps everything when the two histories share nothing', () => {
      expect(ids(mergeChatsData(data([message('mine')]), data([message('theirs')])))).toEqual([
        'theirs',
        'mine',
      ]);
    });
  });

  describe('addsToStored', () => {
    it('is false for an identical history, whatever the key order', () => {
      const stored = data([message('a')]);
      expect(addsToStored(mergeChatsData(data([message('a')]), stored), stored)).toBe(false);
    });

    it('is true for a chat, a later activity or a newer revision the stored one lacks', () => {
      const stored = data([message('a')]);
      const withChat = mergeChatsData(data([message('a')], [chat('c'), chat('new')]), stored);
      const later = mergeChatsData(
        data([message('a')], [chat('c', { lastActivityAt: T0 + 1 })]),
        stored,
      );
      const revised = mergeChatsData(data([message('a', { rev: 1 })]), stored);

      expect([withChat, later, revised].map((merged) => addsToStored(merged, stored))).toEqual([
        true,
        true,
        true,
      ]);
    });
  });

  describe('an echo that raced its own SendMessage answer', () => {
    // Sender tab A: pending "x"; polling tab B got the echo "y" and its "delivered" first.
    const y = message('y', {
      direction: 'outgoing',
      idMessage: 'api-1',
      status: 'delivered',
      rev: 1,
    });
    const pendingX = message('x', { direction: 'outgoing', idMessage: null, status: 'pending' });

    it('keeps the sender localId on the winning copy, then both tabs agree', () => {
      const tabA = data([
        message('x', { direction: 'outgoing', idMessage: 'api-1', status: 'sent', rev: 1 }),
      ]);
      const tabB = data([pendingX, y]);

      const writtenByA = mergeChatsData(tabA, tabB);
      expect(writtenByA.messages.c).toEqual([
        expect.objectContaining({ localId: 'x', idMessage: 'api-1', status: 'delivered' }),
      ]);

      const seenByB = mergeChatsData(tabB, writtenByA);
      expect(seenByB.messages.c).toEqual(writtenByA.messages.c);
      expect(addsToStored(seenByB, writtenByA)).toBe(false);
    });
  });
});
