import type { SharedApi } from '@shared';

import {
  INSTANCE_STATE_VERDICTS,
  type NoticeTone,
} from '../model/constants/instance-state.constant';

export interface InstanceNotice {
  id: string;
  tone: NoticeTone;
  title: string;
  message: string;
}

interface InstanceDiagnostics {
  state: SharedApi.InstanceState | undefined;
  settings: SharedApi.InstanceSettings | undefined;
  quotaDescription: string | null;
}

/**
 * Explains why messages may not arrive. Based on the GREEN-API docs: HTTP API receiving needs an
 * empty webhookUrl, and each notification type must be switched on in the instance settings.
 */
export function buildInstanceNotices({
  state,
  settings,
  quotaDescription,
}: InstanceDiagnostics): InstanceNotice[] {
  const notices: InstanceNotice[] = [];

  const verdict = state ? INSTANCE_STATE_VERDICTS[state] : null;
  if (verdict?.tone) {
    notices.push({
      id: 'state',
      tone: verdict.tone,
      title: 'Проблема с инстансом',
      message: verdict.message,
    });
  }

  if (quotaDescription) {
    notices.push({
      id: 'quota',
      tone: 'error',
      title: 'Исчерпан лимит тарифа',
      message: quotaDescription,
    });
  }

  if (settings?.webhookUrl) {
    notices.push({
      id: 'webhook',
      tone: 'error',
      title: 'Входящие не будут приходить',
      message:
        'В настройках инстанса указан webhookUrl, а получение через HTTP API работает только без него. Очистите поле в личном кабинете и подождите около минуты.',
    });
  }

  if (settings?.incomingWebhook === false) {
    notices.push({
      id: 'incoming',
      tone: 'warning',
      title: 'Уведомления о входящих выключены',
      message:
        'Включите «Получать уведомления о входящих сообщениях и файлах» в настройках инстанса, иначе ответы не появятся в чате.',
    });
  }

  if (settings?.outgoingWebhook === false) {
    notices.push({
      id: 'statuses',
      tone: 'warning',
      title: 'Статусы доставки выключены',
      message:
        'Включите «Получать уведомления о статусах отправленных сообщений», чтобы видеть «доставлено» и «прочитано».',
    });
  }

  return notices;
}
