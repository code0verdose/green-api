import type { SharedApi } from '@shared';

export type NoticeTone = 'warning' | 'error';

export interface InstanceStateVerdict {
  /** Whether a user can work with the instance in this state. */
  canEnter: boolean;
  tone: NoticeTone | null;
  message: string;
}

/** Meaning of each `stateInstance` per the GREEN-API docs, in user language. */
export const INSTANCE_STATE_VERDICTS: Record<SharedApi.InstanceState, InstanceStateVerdict> = {
  authorized: { canEnter: true, tone: null, message: 'Инстанс авторизован.' },
  suspended: {
    canEnter: true,
    tone: 'warning',
    message:
      'На аккаунте временные ограничения: сообщения уходят только тем, кто сохранил ваш номер в контактах.',
  },
  notAuthorized: {
    canEnter: false,
    tone: 'error',
    message:
      'Инстанс не авторизован. Откройте его в личном кабинете GREEN-API и отсканируйте QR-код в приложении мессенджера.',
  },
  starting: {
    canEnter: false,
    tone: 'warning',
    message: 'Инстанс запускается. Это занимает до 5 минут — повторите попытку чуть позже.',
  },
  blocked: {
    canEnter: false,
    tone: 'error',
    message: 'Аккаунт мессенджера заблокирован. Подробности — в личном кабинете GREEN-API.',
  },
  pendingPassword: {
    canEnter: false,
    tone: 'warning',
    message:
      'Авторизация инстанса не завершена: нужен пароль двухфакторной защиты. Завершите её в личном кабинете.',
  },
  unknown: {
    canEnter: true,
    tone: 'warning',
    message: 'Неизвестное состояние инстанса. Проверьте его в личном кабинете GREEN-API.',
  },
};
