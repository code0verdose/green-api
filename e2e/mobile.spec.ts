import { expect, test } from '@playwright/test';

import { openNewChat, sendMessage, signIn } from './support/app';
import { FakeGreenApi } from './support/fake-green-api';

test('phone layout: list → chat → back to the list', async ({ page }) => {
  const api = new FakeGreenApi(page, {
    messenger: 'max',
    accounts: { '79991234567': '10000000' },
    autoReply: () => 'Ответ на телефоне',
  });
  await api.install();
  await signIn(page, api, 'max');

  await openNewChat(page, '79991234567', '10000000');
  await expect(page.getByRole('heading', { name: 'Чаты' })).toBeHidden();
  await sendMessage(page, 'С телефона');
  await expect(page.getByRole('log').getByText('Ответ на телефоне')).toBeVisible();

  await page.getByRole('link', { name: 'К списку чатов' }).click();
  await expect(page.getByRole('heading', { name: 'Чаты' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Василиса Премудрая/ })).toBeVisible();
});
