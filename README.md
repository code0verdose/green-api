# GREEN-API Chat

Веб-чат для отправки и получения текстовых сообщений в MAX и Telegram через
[GREEN-API](https://green-api.com/max). Интерфейс повторяет [web.max.ru](https://web.max.ru/).

|                   MAX                   |                    Telegram                     |
| :-------------------------------------: | :---------------------------------------------: |
|  ![MAX](docs/screenshots/max-chat.png)  | ![Telegram](docs/screenshots/telegram-chat.png) |
| ![Вход](docs/screenshots/max-login.png) |  ![Вход](docs/screenshots/telegram-login.png)   |

<details>
<summary>Мобильная версия</summary>

<img src="docs/screenshots/max-mobile.png" width="320" alt="MAX на телефоне" />

</details>

## Что умеет

1. Вход по `idInstance` и `apiTokenInstance`. Данные проверяются через `getStateInstance`, ошибки
   показываются прямо в форме.
2. Новый чат по номеру телефона. Номер проверяется через `CheckAccount`, чтобы ответ собеседника
   попал в тот же чат. В Telegram можно найти человека по `@username`.
3. Отправка текста через `SendMessage`. Enter отправляет, Shift+Enter переносит строку.
4. Получение сообщений через HTTP API: `ReceiveNotification`, обработка, `DeleteNotification`.

Плюс:

- статусы исходящих: отправлено, доставлено, прочитано, или ошибка с кнопкой «Повторить»;
- сообщение от нового человека само создаёт чат, есть счётчик непрочитанных;
- подсказки, если инстанс не авторизован, задан `webhookUrl` или закончился лимит тарифа;
- история сохраняется после перезагрузки страницы;
- мобильная раскладка, темы MAX и Telegram.

## Локальный запуск

Нужны Node.js 22 и pnpm 12.

```bash
corepack enable
```

```bash
pnpm install
```

```bash
pnpm dev
```

Откройте http://localhost:5173, выберите мессенджер и введите данные инстанса.

### Данные инстанса

1. Создайте инстанс в [личном кабинете GREEN-API](https://console.green-api.com), тариф «Разработчик»
   бесплатный.
2. Авторизуйте его: отсканируйте QR-код из кабинета в приложении MAX или Telegram.
3. Скопируйте `idInstance`, `apiTokenInstance` и `apiUrl`.
4. В настройках инстанса оставьте пустым `webhookUrl` и включите уведомления о входящих сообщениях
   и о статусах. Иначе HTTP API не отдаёт входящие.

## Скрипты

| Команда              | Что делает                                     |
| -------------------- | ---------------------------------------------- |
| `pnpm dev`           | dev-сервер                                     |
| `pnpm build`         | продакшен-сборка                               |
| `pnpm test`          | юнит- и компонентные тесты                     |
| `pnpm test:coverage` | тесты с покрытием                              |
| `pnpm e2e:install`   | установить Chromium для Playwright             |
| `pnpm e2e`           | e2e-тесты на продакшен-сборке                  |
| `pnpm verify`        | типы, линтер, формат, тесты и сборка, как в CI |

## Стек

React 19, TypeScript, Mantine 9, CSS Modules, TanStack Router и Query, Zod, zustand.

Структура по Feature-Sliced Design: `app`, `pages`, `widgets`, `units` (`session`, `chat`,
`notification`), `shared`. Бэкенда нет, браузер обращается к GREEN-API напрямую. Входящие забираются
long polling, уведомление удаляется из очереди только после обработки. Если открыто несколько
вкладок, очередь опрашивает одна из них.

Токен хранится в `sessionStorage` и удаляется при выходе. `apiUrl` принимается только с доменов
GREEN-API.

## Тесты

- 454 юнит-, компонентных и интеграционных теста на Vitest, Testing Library и MSW, покрытие строк 99%.
- 9 e2e-сценариев на Playwright: сценарий из задания для MAX и Telegram, неверный токен,
  несуществующий номер, перезагрузка, выход, мобильная версия.
- GitHub Actions прогоняет всё это на каждый push и pull request.

## Документация

[PRD](docs/product/prd.md), [архитектура](docs/architecture/overview.md),
[решения (ADR)](docs/architecture/adr/), [используемые методы GREEN-API](docs/api/green-api.md),
[эпики и задачи](epics/README.md).
