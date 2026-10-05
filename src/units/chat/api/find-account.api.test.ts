import { http, HttpResponse } from 'msw';

import { SharedApi } from '@shared';
import { apiMethodUrl, TEST_CREDENTIALS } from '@shared/test/green-api.fixtures';
import { mswServer } from '@shared/test/msw-server';

import { findAccount } from './find-account.api';

const client = SharedApi.createGreenApiClient(TEST_CREDENTIALS);

const respond = (body: Parameters<typeof HttpResponse.json>[0]) =>
  mswServer.use(http.post(apiMethodUrl('checkAccount'), () => HttpResponse.json(body)));

describe('findAccount', () => {
  it('returns the chatId of an existing account', async () => {
    respond({ exist: true, chatId: '10000000' });

    await expect(
      findAccount(client, { kind: 'phone', phone: '79991234567' }, 'max'),
    ).resolves.toEqual({ chatId: '10000000', username: null });
  });

  it.each([
    ['max', { kind: 'phone', phone: '79991234567' }, 'У этого номера нет аккаунта MAX.'],
    ['telegram', { kind: 'phone', phone: '79991234567' }, /скрыт настройками приватности/],
    [
      'telegram',
      { kind: 'username', username: '@ghost' },
      'Пользователь @ghost не найден в Telegram.',
    ],
  ] as const)('explains a missing %s account (%o)', async (messenger, recipient, message) => {
    respond({ exist: false, chatId: '' });

    await expect(findAccount(client, recipient, messenger)).rejects.toThrow(message);
  });
});
