import { parseStoredHistory } from './parse-stored-history.util';

const chat = (id: string) => ({
  id,
  title: id,
  phone: null,
  username: null,
  unread: 0,
  lastActivityAt: 1,
});

const message = (localId: string, chatId: string) => ({
  localId,
  idMessage: localId,
  chatId,
  direction: 'incoming',
  kind: 'text',
  text: localId,
  timestamp: 1,
  status: null,
  error: null,
  rev: 1,
});

describe('parseStoredHistory', () => {
  it('reads a valid history as is', () => {
    expect(
      parseStoredHistory({ chats: { a: chat('a') }, messages: { a: [message('m1', 'a')] } }),
    ).toEqual({ chats: { a: chat('a') }, messages: { a: [message('m1', 'a')] } });
  });

  it('reads a message saved before revisions existed as revision zero', () => {
    const { rev: _rev, ...older } = message('m1', 'a');
    const garbled = ['two', -1, 1.5].map((rev, index) => ({ ...message(`g${index}`, 'a'), rev }));

    expect(
      parseStoredHistory({ chats: { a: chat('a') }, messages: { a: [older, ...garbled] } })
        ?.messages.a,
    ).toEqual([{ ...message('m1', 'a'), rev: 0 }, ...garbled.map((item) => ({ ...item, rev: 0 }))]);
  });

  it('drops a chat stored under a key that is not its id', () => {
    // A retry uses message.chatId, so a mislabelled record would send to the wrong chat.
    expect(parseStoredHistory({ chats: { a: chat('b') }, messages: {} })).toEqual({
      chats: {},
      messages: {},
    });
  });

  it('drops a message filed under another chat', () => {
    expect(
      parseStoredHistory({
        chats: { a: chat('a') },
        messages: { a: [message('own', 'a'), message('foreign', 'b')] },
      })?.messages.a?.map((item) => item.localId),
    ).toEqual(['own']);
  });

  it('ignores messages of chats that are not stored', () => {
    expect(parseStoredHistory({ chats: {}, messages: { ghost: [message('m', 'ghost')] } })).toEqual(
      { chats: {}, messages: {} },
    );
  });

  it.each([null, undefined, 42, 'text', { chats: [] }, { chats: {}, messages: { a: 'x' } }])(
    'returns null for an unreadable value (%o)',
    (value) => {
      expect(parseStoredHistory(value)).toBeNull();
    },
  );
});
