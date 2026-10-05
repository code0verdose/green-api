/** Per-chat cap; a full localStorage is handled separately (trim to QUOTA_TRIM and retry). */
export const MAX_MESSAGES_PER_CHAT = 500;

/** Prefix of the history key; each instance (`messenger:idInstance`) gets its own key. */
export const CHAT_STORAGE_KEY = 'green-api-chat:chats';
export const CHAT_STORAGE_VERSION = 1;

/** When localStorage is full, every chat is cut down to its newest messages and written again. */
export const QUOTA_TRIM_MESSAGES_PER_CHAT = 100;

/** How far apart an unconfirmed send and its API echo may be to count as the same message. */
export const AMBIGUOUS_ECHO_WINDOW_MS = 5 * 60 * 1000;

/** Each kind is shown once per instance: a later, worse problem must not hide behind an earlier one. */
export const STORAGE_PROBLEM_TEXT = {
  blocked: 'Браузер не даёт сохранить историю: она пропадёт после перезагрузки.',
  trimmed: `Память браузера заполнена: в истории оставлены последние ${QUOTA_TRIM_MESSAGES_PER_CHAT} сообщений каждого чата.`,
  full: 'Память браузера заполнена: новые сообщения не сохранятся после перезагрузки.',
} as const;

export type StorageProblem = keyof typeof STORAGE_PROBLEM_TEXT;
