import { trimStoredHistory } from './trim-stored-history.util';

const stored = (perChat: number[]) =>
  JSON.stringify({
    version: 1,
    state: {
      chats: Object.fromEntries(perChat.map((_, index) => [`c${index}`, { id: `c${index}` }])),
      messages: Object.fromEntries(
        perChat.map((count, index) => [
          `c${index}`,
          Array.from({ length: count }, (_, n) => ({ localId: `m${n}` })),
        ]),
      ),
    },
  });

describe('trimStoredHistory', () => {
  it('keeps only the newest messages of each chat', () => {
    const trimmed = JSON.parse(trimStoredHistory(stored([500, 20]), 100)) as {
      version: number;
      state: { messages: Record<string, Array<{ localId: string }>>; chats: object };
    };

    expect(trimmed.version).toBe(1);
    expect(trimmed.state.messages.c0).toHaveLength(100);
    expect(trimmed.state.messages.c0?.[0]?.localId).toBe('m400');
    expect(trimmed.state.messages.c1).toHaveLength(20);
    expect(Object.keys(trimmed.state.chats)).toEqual(['c0', 'c1']);
  });

  it('returns unreadable input unchanged', () => {
    expect(trimStoredHistory('not json', 100)).toBe('not json');
    expect(trimStoredHistory('{"state":null}', 100)).toBe('{"state":null}');
  });
});
