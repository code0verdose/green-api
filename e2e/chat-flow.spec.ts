import { expect, test } from '@playwright/test';

import { createChat, openNewChat, sendMessage, signIn } from './support/app';
import { FakeGreenApi } from './support/fake-green-api';

/** The TZ scenario, step by step, for both versions. */
for (const messenger of ['max', 'telegram'] as const) {
  test.describe(`${messenger}: scenario from the TZ`, () => {
    test('sign in → new chat by phone → send → see the reply', async ({ page }) => {
      const api = new FakeGreenApi(page, {
        messenger,
        accounts: { '79991234567': '10000000' },
        autoReply: (text) => (text === 'Привет!' ? 'Здравствуйте! Получила ваше сообщение.' : null),
      });
      await api.install();

      await signIn(page, api, messenger);
      await createChat(page, '+7 (999) 123-45-67');

      await expect(page).toHaveURL(/\/chats\/10000000$/);
      await expect(page.getByRole('heading', { name: '+7 999 123-45-67' })).toBeVisible();

      await sendMessage(page, 'Привет!');

      const feed = page.getByRole('log', { name: 'Сообщения' });
      await expect(feed.getByText('Привет!')).toBeVisible();
      await expect(feed.getByText('Здравствуйте! Получила ваше сообщение.')).toBeVisible();
      await expect(feed.getByRole('img', { name: 'Прочитано' })).toBeVisible();
      // The chat is renamed from the phone to the sender's name from the notification.
      await expect(page.getByRole('heading', { name: 'Василиса Премудрая' })).toBeVisible();
      await expect(page.getByRole('status')).toHaveText('В сети');

      expect(api.sent).toEqual([{ chatId: '10000000', message: 'Привет!' }]);
      // Every received notification was acknowledged with DeleteNotification.
      await expect.poll(() => api.pendingNotifications).toBe(0);
      expect(api.deletedReceipts).toEqual([1, 2, 3]);
    });
  });
}

test('a message from a new person creates a chat with an unread badge', async ({ page }) => {
  const api = new FakeGreenApi(page, {
    messenger: 'max',
    accounts: { '79991234567': '10000000' },
  });
  await api.install();
  await signIn(page, api, 'max');
  await openNewChat(page, '79991234567', '10000000');

  api.pushIncoming('20000000', 'Добрый день! Это Иван.', {
    name: 'Иван Петров',
    phone: 79990001122,
  });

  const newChat = page.getByRole('link', { name: /Иван Петров/ });
  await expect(newChat).toBeVisible();
  await expect(newChat.getByLabel('Непрочитанных: 1')).toBeVisible();

  await newChat.click();
  await expect(page.getByRole('log').getByText('Добрый день! Это Иван.')).toBeVisible();
  await expect(newChat.getByLabel('Непрочитанных: 1')).toBeHidden();
});

test('Telegram: a chat can be started by @username', async ({ page }) => {
  const api = new FakeGreenApi(page, { messenger: 'telegram', accounts: { '@durov': '555' } });
  await api.install();
  await signIn(page, api, 'telegram');

  await createChat(page, '@durov');

  await expect(page).toHaveURL(/\/chats\/555$/);
  await expect(page.getByRole('heading', { name: '@durov' })).toBeVisible();
});

test('an unknown number is explained instead of opening an empty chat', async ({ page }) => {
  const api = new FakeGreenApi(page, { messenger: 'max', accounts: {} });
  await api.install();
  await signIn(page, api, 'max');

  await createChat(page, '+7 999 000-00-00');

  await expect(page.getByText('У этого номера нет аккаунта MAX.')).toBeVisible();
  await expect(page).not.toHaveURL(/\/chats\//);
});

test('a wrong token is reported on the login form', async ({ page }) => {
  const api = new FakeGreenApi(page, { messenger: 'max' });
  await api.install();
  await page.goto('/login');

  await page.getByLabel('idInstance').fill(api.instance.idInstance);
  await page.getByLabel('apiTokenInstance').fill('wrong-token');
  await page.getByLabel('apiUrl').fill(api.instance.apiUrl);
  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(page.getByRole('alert')).toHaveText('Неверный idInstance или apiTokenInstance.');
  await expect(page).toHaveURL(/\/login/);
});

test('history survives a reload; sign-out forgets token and history', async ({ page }) => {
  const api = new FakeGreenApi(page, {
    messenger: 'max',
    accounts: { '79991234567': '10000000' },
  });
  await api.install();
  await signIn(page, api, 'max');
  await openNewChat(page, '79991234567', '10000000');
  await sendMessage(page, 'Сохранится?');
  await expect(page.getByRole('log').getByText('Сохранится?')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('log').getByText('Сохранится?')).toBeVisible();

  await page.getByRole('button', { name: 'Аккаунт' }).click();
  await page.getByRole('menuitem', { name: 'Выйти' }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto('/chats/10000000');
  await expect(page).toHaveURL(/\/login\?redirect=/);
  // Nothing of the conversation is left in the browser storage.
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(storage).not.toContain('Сохранится?');
  expect(storage).not.toContain('e2e-token');
});

test('two tabs signed in to different messengers keep separate histories', async ({ context }) => {
  const maxTab = await context.newPage();
  const maxApi = new FakeGreenApi(maxTab, {
    messenger: 'max',
    accounts: { '79991234567': '10000000' },
  });
  await maxApi.install();
  await signIn(maxTab, maxApi, 'max');
  await openNewChat(maxTab, '79991234567', '10000000');
  await sendMessage(maxTab, 'Сообщение в MAX');
  await expect(maxTab.getByRole('log').getByText('Сообщение в MAX')).toBeVisible();

  // Same browser profile, same localStorage — another tab signs in to Telegram.
  const telegramTab = await context.newPage();
  const telegramApi = new FakeGreenApi(telegramTab, {
    messenger: 'telegram',
    accounts: { '79035550101': '20000000' },
  });
  await telegramApi.install();
  await signIn(telegramTab, telegramApi, 'telegram');
  await expect(telegramTab.getByText('Чатов пока нет')).toBeVisible();

  await maxTab.reload();
  await expect(maxTab.getByRole('log').getByText('Сообщение в MAX')).toBeVisible();
});
