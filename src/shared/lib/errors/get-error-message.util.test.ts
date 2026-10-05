import { GREEN_API_CONSOLE_URL } from '@shared/config';
import { GreenApiError, type GreenApiErrorKind } from '@shared/api';

import { getErrorMessage } from './get-error-message.util';

describe('getErrorMessage', () => {
  it.each<[GreenApiErrorKind, RegExp]>([
    ['unauthorized', /Неверный idInstance или apiTokenInstance/],
    ['forbidden', /Неверный idInstance или apiTokenInstance/],
    ['not-found', /apiUrl/],
    ['rate-limited', /Слишком много запросов/],
    ['quota-exceeded', /лимит тарифа/],
    ['contact-check-limit', /проверок номеров/],
    ['webhook-configured', /webhookUrl/],
    ['instance-not-ready', /не авторизован или запускается/],
    ['instance-expired', /истёк/],
    ['bad-request', /отклонил запрос/],
    ['server', /временно недоступен/],
    ['network', /Нет связи с GREEN-API/],
    ['timeout', /не ответил вовремя/],
    ['invalid-response', /неожиданный ответ/],
    ['unknown', /Что-то пошло не так/],
  ])('has a dedicated text for "%s"', (kind, expected) => {
    expect(getErrorMessage(new GreenApiError(kind))).toMatch(expected);
  });

  it('points to the personal console where the user can fix the problem', () => {
    expect(getErrorMessage(new GreenApiError('webhook-configured'))).toContain(
      GREEN_API_CONSOLE_URL,
    );
  });

  it('uses the message of a plain Error', () => {
    expect(getErrorMessage(new Error('Номер не найден'))).toBe('Номер не найден');
  });

  it('falls back to a generic text for anything else', () => {
    expect(getErrorMessage('boom')).toMatch(/Что-то пошло не так/);
    expect(getErrorMessage(new Error(''))).toMatch(/Что-то пошло не так/);
  });
});
