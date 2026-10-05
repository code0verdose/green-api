import { expect, type Page } from '@playwright/test';

import { FAKE_TOKEN, type FakeGreenApi } from './fake-green-api';

const MESSENGER_LABEL = { max: 'MAX', telegram: 'Telegram' } as const;

export async function signIn(page: Page, api: FakeGreenApi, messenger: 'max' | 'telegram') {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
  await page.getByText(MESSENGER_LABEL[messenger], { exact: true }).click();
  await page.getByLabel('idInstance').fill(api.instance.idInstance);
  await page.getByLabel('apiTokenInstance').fill(FAKE_TOKEN);
  await page.getByLabel('apiUrl').fill(api.instance.apiUrl);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page.getByRole('heading', { name: 'Чаты' })).toBeVisible();
}

export async function createChat(page: Page, recipient: string) {
  await page.getByRole('button', { name: 'Новый чат' }).first().click();
  await page.getByRole('dialog').getByRole('textbox').fill(recipient);
  await page.getByRole('button', { name: 'Создать чат' }).click();
}

/** Creates a chat and waits until it is actually open, so the next typing goes to it. */
export async function openNewChat(page: Page, recipient: string, chatId: string) {
  await createChat(page, recipient);
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`/chats/${chatId}$`));
}

export async function sendMessage(page: Page, text: string) {
  const input = page.getByRole('textbox', { name: 'Текст сообщения' });
  await input.fill(text);
  await input.press('Enter');
}
