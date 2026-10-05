/** Placeholder labels for message types the app does not render (TZ: text only). */
export const UNSUPPORTED_MESSAGE_LABELS: Readonly<Record<string, string>> = {
  imageMessage: 'Фото',
  videoMessage: 'Видео',
  documentMessage: 'Документ',
  audioMessage: 'Аудио',
  stickerMessage: 'Стикер',
  locationMessage: 'Геопозиция',
  contactMessage: 'Контакт',
  pollMessage: 'Опрос',
};

export const UNSUPPORTED_MESSAGE_FALLBACK_LABEL = 'Сообщение';

export const UNSUPPORTED_MESSAGE_SUFFIX = 'этот тип сообщений здесь не поддерживается';

/** Events about existing messages, not new ones — out of scope for a text-only chat. */
export const IGNORED_MESSAGE_TYPES: ReadonlySet<string> = new Set([
  'reactionMessage',
  'deletedMessage',
  'editedMessage',
]);

export const FAILED_STATUS_REASONS = {
  noAccount: 'Получатель не найден в мессенджере. Создайте чат заново по номеру.',
  notInGroup: 'Вы не участник этой группы.',
  unresolvableChat: 'Мессенджер не узнал получателя. Создайте чат заново по номеру.',
  failed: 'Мессенджер не принял сообщение.',
} as const;

export const QUOTA_FALLBACK_DESCRIPTION =
  'Исчерпан лимит тарифа GREEN-API. Проверьте тариф в личном кабинете.';
