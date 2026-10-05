interface StoredHistory {
  state?: { messages?: Record<string, unknown[]> } | null;
}

/**
 * Shrinks a serialized history to the newest `keepPerChat` messages of every chat.
 * Used when localStorage is full: losing old messages beats losing the new one.
 */
export function trimStoredHistory(serialized: string, keepPerChat: number): string {
  let parsed: StoredHistory;
  try {
    parsed = JSON.parse(serialized) as StoredHistory;
  } catch {
    return serialized;
  }
  const messages = parsed.state?.messages;
  if (!messages || typeof messages !== 'object') return serialized;

  const trimmed = Object.fromEntries(
    Object.entries(messages).map(([chatId, list]) => [
      chatId,
      Array.isArray(list) ? list.slice(-keepPerChat) : list,
    ]),
  );
  return JSON.stringify({ ...parsed, state: { ...parsed.state, messages: trimmed } });
}
