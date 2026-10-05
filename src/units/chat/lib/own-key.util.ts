/**
 * Reads a record entry only if it is the record's own key. Chat ids reach the store from URLs
 * and notifications, and `chats['constructor']` must not resolve to Object.prototype.
 */
export const ownValue = <T>(record: Readonly<Record<string, T>>, key: string): T | undefined =>
  Object.hasOwn(record, key) ? record[key] : undefined;
