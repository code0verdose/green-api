import type { MessageDirection, MessageStatus } from '../../types/chat.types';

/** Accessible names of the status ticks under outgoing messages. */
export const MESSAGE_STATUS_LABEL: Record<MessageStatus, string> = {
  pending: 'Отправляется',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не отправлено',
};

/** Read before each message by screen readers; sighted users tell it by the bubble side. */
export const MESSAGE_AUTHOR_LABEL: Record<MessageDirection, string> = {
  outgoing: 'Вы: ',
  incoming: 'Собеседник: ',
};
