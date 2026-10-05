import { type GreenApiErrorKind, isGreenApiError } from '@shared/api';
import { GREEN_API_CONSOLE_URL } from '@shared/config';

const FALLBACK = 'Что-то пошло не так. Попробуйте ещё раз.';

const MESSAGES: Record<GreenApiErrorKind, string> = {
  unauthorized: 'Неверный idInstance или apiTokenInstance.',
  forbidden: 'Неверный idInstance или apiTokenInstance.',
  'not-found': 'GREEN-API не нашёл этот адрес. Проверьте apiUrl в личном кабинете.',
  'rate-limited': 'Слишком много запросов. Подождите немного и повторите.',
  'quota-exceeded': `Исчерпан лимит тарифа (на «Разработчике» — 3 чата в месяц). Тариф меняется в личном кабинете: ${GREEN_API_CONSOLE_URL}`,
  'contact-check-limit':
    'Мессенджер ограничил частоту проверок номеров. Повторите через пару часов.',
  'webhook-configured': `В настройках инстанса указан webhookUrl, поэтому входящие нельзя получить через HTTP API. Очистите его в личном кабинете: ${GREEN_API_CONSOLE_URL}`,
  'instance-not-ready': `Инстанс не авторизован или запускается. Проверьте его состояние в личном кабинете: ${GREEN_API_CONSOLE_URL}`,
  'instance-expired': `Срок действия инстанса истёк или он удалён. Продлите его в личном кабинете: ${GREEN_API_CONSOLE_URL}`,
  'bad-request': 'GREEN-API отклонил запрос. Проверьте введённые данные.',
  server: 'GREEN-API временно недоступен. Повторите попытку позже.',
  network: 'Нет связи с GREEN-API. Проверьте интернет и apiUrl.',
  timeout: 'GREEN-API не ответил вовремя. Повторите попытку.',
  'invalid-response': 'GREEN-API прислал неожиданный ответ. Повторите попытку позже.',
  unknown: FALLBACK,
};

/** Turns any thrown value into a sentence a user can act on. */
export function getErrorMessage(error: unknown): string {
  if (isGreenApiError(error)) return MESSAGES[error.kind];
  if (error instanceof Error && error.message) return error.message;
  return FALLBACK;
}
