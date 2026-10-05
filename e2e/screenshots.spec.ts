import { expect, type Page, test } from '@playwright/test';

import { openNewChat, sendMessage, signIn } from './support/app';
import { FakeGreenApi } from './support/fake-green-api';

/**
 * README screenshots. Not part of the regular run: `pnpm e2e:screenshots`.
 * Uses the same fake GREEN-API as the e2e suite, so the pictures show the real UI.
 */
test.skip(!process.env.SCREENSHOTS, 'Run with SCREENSHOTS=1 to refresh docs/screenshots');

const shot = (page: Page, name: string) =>
  page.screenshot({ path: `docs/screenshots/${name}.png`, animations: 'disabled' });

const REPLIES: Record<string, string> = {
  'Добрый день! Подскажите, заказ №1842 уже отправили?':
    'Здравствуйте! Да, сегодня утром передали в доставку 📦',
  'Отлично, спасибо! А трек-номер пришлёте?': 'Конечно: RU-4417-0093. Курьер позвонит заранее.',
};

for (const messenger of ['max', 'telegram'] as const) {
  test(`${messenger}: login and chat screens`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const api = new FakeGreenApi(page, {
      messenger,
      accounts: { '79991234567': '10000000', '79035550101': '20000000' },
      autoReply: (text) => REPLIES[text] ?? null,
    });
    await api.install();

    await page.goto('/login');
    await page.getByText(messenger === 'max' ? 'MAX' : 'Telegram', { exact: true }).click();
    await page.waitForTimeout(300);
    await shot(page, `${messenger}-login`);

    await signIn(page, api, messenger);
    await openNewChat(page, '+7 903 555-01-01', '20000000');
    api.pushIncoming('20000000', 'Встреча переносится на 15:00, ок?', {
      name: 'Алексей Смирнов',
      phone: 79035550101,
    });
    await expect(page.getByRole('log').getByText('Встреча переносится')).toBeVisible();
    await sendMessage(page, 'Да, удобно 👍');

    await openNewChat(page, '+7 999 123-45-67', '10000000');
    await sendMessage(page, 'Добрый день! Подскажите, заказ №1842 уже отправили?');
    await expect(page.getByRole('log').getByText('передали в доставку')).toBeVisible();
    await sendMessage(page, 'Отлично, спасибо! А трек-номер пришлёте?');
    await expect(page.getByRole('log').getByText('RU-4417-0093')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Прочитано' }).last()).toBeVisible();

    await shot(page, `${messenger}-chat`);
  });
}

test('max: phone layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const api = new FakeGreenApi(page, {
    messenger: 'max',
    accounts: { '79991234567': '10000000' },
    autoReply: (text) => REPLIES[text] ?? null,
  });
  await api.install();
  await signIn(page, api, 'max');
  await openNewChat(page, '+7 999 123-45-67', '10000000');
  await sendMessage(page, 'Добрый день! Подскажите, заказ №1842 уже отправили?');
  await expect(page.getByRole('log').getByText('передали в доставку')).toBeVisible();

  await shot(page, 'max-mobile');
});
