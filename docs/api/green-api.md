# Контракт с GREEN-API

Источник — документация GREEN-API (MAX: `green-api.com/v3/docs`, Telegram: `green-api.com/telegram/docs`),
прочитанная по сырому тексту страниц 2026-10-05. Реализация — `src/shared/api/green-api.client.ts`,
схемы ответов — `src/shared/api/schemas/`.

## Адрес запроса

```
{apiUrl}/waInstance{idInstance}/{method}/{apiTokenInstance}
```

- `apiUrl` — из личного кабинета. **По `idInstance` не вычисляется**: в примере документации MAX
  хост `3100.api.green-api.com` обслуживает инстанс `3000000001`.
- Для MAX префикс `/v3/` перед `waInstance` необязателен (оставлен для совместимости).
- CORS: `access-control-allow-origin: *`, методы `GET, POST, OPTIONS, DELETE`, заголовок
  `Content-Type` разрешён (проверено `curl -X OPTIONS`).

## Используемые методы

| Метод                 | HTTP   | Тело / параметры                                                 | Ответ                                                                  | Лимит, запр./с | Где          |
| --------------------- | ------ | ---------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------- | ------------ |
| `getStateInstance`    | GET    | —                                                                | `{ stateInstance }`                                                    | 1              | вход, баннер |
| `getSettings`         | GET    | —                                                                | `{ webhookUrl, incomingWebhook, outgoingWebhook, … }` (`"yes"`/`"no"`) | 1              | баннер       |
| `checkAccount`        | POST   | `{ phoneNumber: number }` или (Telegram) `{ username: "@name" }` | `{ exist, chatId }` или `{ status: false, reason }`                    | 10             | новый чат    |
| `sendMessage`         | POST   | `{ chatId, message }`                                            | `{ idMessage }`                                                        | 50             | отправка     |
| `receiveNotification` | GET    | `?receiveTimeout=5…60`                                           | `null` или `{ receiptId, body }`                                       | 100            | поллер       |
| `deleteNotification`  | DELETE | `/{receiptId}` в пути                                            | `{ result, reason }`                                                   | 100            | поллер       |

Лимит длины `message`: MAX — 4000 символов, Telegram — 4096.

## Состояния инстанса (`stateInstance`)

`authorized` · `notAuthorized` · `blocked` · `starting` (до 5 минут) · `suspended` (отправка только
контактам) · `pendingPassword` (нужен пароль 2FA). Неизвестное значение приложение трактует как
`unknown` и не падает.

## Обрабатываемые уведомления (`typeWebhook`)

| Тип                          | Поля, которые читаем                                                                                                                                                                                                | Что делает приложение                                                                                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `incomingMessageReceived`    | `idMessage`, `timestamp` (с), `senderData.{chatId, chatType, chatName, senderName, senderContactName, senderPhoneNumber}`, `messageData.typeMessage`, `textMessageData.textMessage`, `extendedTextMessageData.text` | входящее; не текст → заглушка                                                                                                                                                                                                  |
| `outgoingMessageReceived`    | как выше                                                                                                                                                                                                            | исходящее, отправленное с телефона                                                                                                                                                                                             |
| `outgoingAPIMessageReceived` | как выше                                                                                                                                                                                                            | эхо отправки через API; дубль по `idMessage` отбрасывается. Если отправка закончилась неясно (таймаут, обрыв) и пузырь помечен «не отправлено», эхо с тем же текстом в пределах 5 минут подхватывает этот пузырь вместо нового |
| `outgoingMessageStatus`      | `chatId`, `idMessage`, `status`, `description`                                                                                                                                                                      | `sent`/`delivered`/`read`; `failed`/`noAccount`/`notInGroup` → «не отправлено»                                                                                                                                                 |
| `stateInstanceChanged`       | `stateInstance`                                                                                                                                                                                                     | обновляет состояние инстанса в кеше                                                                                                                                                                                            |
| `quotaExceeded`              | `quotaData.description`                                                                                                                                                                                             | баннер «Исчерпан лимит тарифа»                                                                                                                                                                                                 |

Групповые чаты (`chatType` ≠ `user` или `chatId` с `-`), реакции, правки и удаления — пропускаются,
но удаляются из очереди.

## Ошибки и их тексты

| HTTP      | Признак                                  | `GreenApiError.kind`                       | Поллер      |
| --------- | ---------------------------------------- | ------------------------------------------ | ----------- |
| 400       | «webhook url is set»                     | `webhook-configured`                       | стоп        |
| 400       | «instance is starting or not authorized» | `instance-not-ready`                       | повтор      |
| 400       | «expired» / «Instance is deleted»        | `instance-expired`                         | стоп        |
| 400       | прочее                                   | `bad-request`                              | повтор      |
| 401 / 403 | —                                        | `unauthorized` / `forbidden`               | стоп, выход |
| 404       | —                                        | `not-found` (неверный `apiUrl`)            | стоп        |
| 429       | —                                        | `rate-limited`                             | повтор      |
| 466       | `correspondentsStatus`                   | `quota-exceeded`                           | повтор      |
| 469       | «contact info limit»                     | `contact-check-limit`                      | —           |
| 5xx       | —                                        | `server`                                   | повтор      |
| —         | сеть / таймаут / не-JSON / не та схема   | `network` / `timeout` / `invalid-response` | повтор      |

Русские тексты для пользователя — `src/shared/lib/errors/get-error-message.util.ts`.

## Настройка инстанса для этого приложения

В личном кабинете GREEN-API → инстанс → «Изменить»:

- **URL для уведомлений (`webhookUrl`) — пустой.** Иначе HTTP API не отдаёт уведомления.
- Включить «Получать уведомления о входящих сообщениях и файлах» (`incomingWebhook`).
- Включить «… о статусах отправленных сообщений» (`outgoingWebhook`) — для «доставлено/прочитано».
- По желанию — «… о сообщениях, отправленных с телефона» (`outgoingMessageWebhook`).
