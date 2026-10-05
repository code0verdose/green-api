import type { Chat, ChatsData, Message } from '../types/chat.types';
import {
  buildChatListItems,
  failInterruptedSends,
  toChatListItemView,
  toMessageDayGroupViews,
  getInitials,
  groupMessagesByDay,
  pickAvatarColor,
} from './chat-view.util';

const NOW = Date.UTC(2026, 9, 5, 15, 0);
const HOUR = 60 * 60 * 1000;

const chat = (id: string, lastActivityAt: number, extra: Partial<Chat> = {}): Chat => ({
  id,
  title: `Чат ${id}`,
  phone: null,
  username: null,
  unread: 0,
  lastActivityAt,
  ...extra,
});

const message = (chatId: string, timestamp: number, extra: Partial<Message> = {}): Message => ({
  localId: `${chatId}-${timestamp}`,
  idMessage: `${chatId}-${timestamp}`,
  chatId,
  direction: 'incoming',
  kind: 'text',
  text: 'Привет',
  timestamp,
  status: null,
  error: null,
  rev: 0,
  ...extra,
});

describe('buildChatListItems', () => {
  it('sorts chats by last activity, newest first, with the last message attached', () => {
    const data: ChatsData = {
      owner: 'max:1',
      chats: {
        a: chat('a', NOW - 3 * HOUR),
        b: chat('b', NOW - HOUR),
        c: chat('c', NOW - 2 * HOUR),
      },
      messages: { a: [message('a', NOW - 3 * HOUR)], b: [], c: [] },
    };

    const items = buildChatListItems(data);

    expect(items.map((item) => item.chat.id)).toEqual(['b', 'c', 'a']);
    expect(items[2]?.lastMessage?.idMessage).toBe(`a-${NOW - 3 * HOUR}`);
    expect(items[0]?.lastMessage).toBeNull();
  });
});

describe('groupMessagesByDay', () => {
  it('splits the feed into calendar days with readable labels', () => {
    const messages = [
      message('a', Date.UTC(2026, 9, 4, 10)),
      message('a', Date.UTC(2026, 9, 5, 9)),
      message('a', Date.UTC(2026, 9, 5, 14)),
    ];

    const groups = groupMessagesByDay(messages, NOW);

    expect(groups.map((group) => [group.label, group.messages.length])).toEqual([
      ['Вчера', 1],
      ['Сегодня', 2],
    ]);
    expect(new Set(groups.map((group) => group.key)).size).toBe(2);
  });

  it('returns nothing for an empty feed', () => {
    expect(groupMessagesByDay([], NOW)).toEqual([]);
  });
});

describe('avatar helpers', () => {
  it.each([
    ['Василиса Премудрая', 'ВП'],
    ['Василиса', 'В'],
    ['  иван   петров  сидоров ', 'ИП'],
    ['+7 999 123-45-67', '#'],
    ['@durov', 'D'],
    ['', '#'],
  ])('takes initials of "%s" → "%s"', (title, initials) => {
    expect(getInitials(title)).toBe(initials);
  });

  it('picks a stable colour from the MAX palette', () => {
    expect(pickAvatarColor('10000000')).toBe(pickAvatarColor('10000000'));
    expect(pickAvatarColor('10000000')).toMatch(/^#[0-9a-f]{6}$/);
    const colors = new Set(['1', '2', '3', '4', '5', '6', '7', '8'].map(pickAvatarColor));
    expect(colors.size).toBeGreaterThan(1);
  });
});

describe('failInterruptedSends', () => {
  it('turns messages left pending by a closed tab into failed ones', () => {
    const data: ChatsData = {
      owner: 'max:1',
      chats: { a: chat('a', NOW) },
      messages: {
        a: [
          message('a', NOW, { direction: 'outgoing', status: 'pending', idMessage: null }),
          message('a', NOW + 1, { direction: 'outgoing', status: 'sent' }),
        ],
      },
    };

    const result = failInterruptedSends(data);

    expect(result.messages.a?.map((item) => item.status)).toEqual(['failed', 'sent']);
    expect(result.messages.a?.[0]?.error).toMatch(/могло уйти/);
    // A newer revision, so a live tab still holding the pending copy takes the failed one.
    expect(result.messages.a?.map((item) => item.rev)).toEqual([1, 0]);
  });

  it('returns the same object when nothing was pending', () => {
    const data: ChatsData = { owner: null, chats: {}, messages: { a: [message('a', NOW)] } };
    expect(failInterruptedSends(data)).toBe(data);
  });
});

describe('toChatListItemView', () => {
  const base = chat('a', NOW, { title: 'Василиса Премудрая', phone: '79991234567', unread: 2 });

  it('renders an incoming last message as is', () => {
    const view = toChatListItemView(
      { chat: base, lastMessage: message('a', NOW - HOUR, { text: 'Первая строка\nвторая' }) },
      'a',
      NOW,
    );

    expect(view).toMatchObject({
      id: 'a',
      title: 'Василиса Премудрая',
      preview: 'Первая строка',
      time: '14:00',
      unread: 2,
      isActive: true,
      initials: 'ВП',
      lastStatus: null,
    });
  });

  it('prefixes our own message with «Вы:» and exposes its status', () => {
    const view = toChatListItemView(
      { chat: base, lastMessage: message('a', NOW, { direction: 'outgoing', status: 'read' }) },
      undefined,
      NOW,
    );

    expect(view).toMatchObject({ preview: 'Вы: Привет', isActive: false, lastStatus: 'read' });
  });

  it('falls back to the contact, then to a placeholder, for an empty chat', () => {
    expect(toChatListItemView({ chat: base, lastMessage: null }, undefined, NOW)).toMatchObject({
      preview: '+7 999 123-45-67',
      time: '',
    });
    expect(
      toChatListItemView(
        { chat: chat('b', NOW, { username: '@durov' }), lastMessage: null },
        undefined,
        NOW,
      ).preview,
    ).toBe('@durov');
    expect(
      toChatListItemView({ chat: chat('c', NOW), lastMessage: null }, undefined, NOW).preview,
    ).toBe('Нет сообщений');
  });
});

describe('toMessageDayGroupViews', () => {
  it('adds a formatted time to every message', () => {
    const [group] = toMessageDayGroupViews([message('a', Date.UTC(2026, 9, 5, 9, 7))], NOW);
    expect(group?.messages[0]?.time).toBe('09:07');
  });
});
