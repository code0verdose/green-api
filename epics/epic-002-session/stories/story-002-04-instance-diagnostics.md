---
id: STORY-002-04
epic: EPIC-002
title: Диагностика настроек и состояния инстанса
status: done
---

# STORY-002-04 — Диагностика настроек и состояния инстанса

**Как** разработчик-интегратор **хочу** видеть, почему не приходят входящие,
**чтобы** не отлаживать молчание.

## Факты из документации GREEN-API

- Получение по HTTP API требует **пустой** `webhookUrl`, иначе `ReceiveNotification` отвечает
  400 «Message cannot be received because custom webhook url is set».
- Входящие приходят, только если включено `incomingWebhook = "yes"`; статусы исходящих —
  `outgoingWebhook`, исходящие с телефона — `outgoingMessageWebhook`, через API — `outgoingAPIMessageWebhook`.
- Смена состояния инстанса приходит уведомлением `stateInstanceChanged` (при `stateWebhook = "yes"`).

## Acceptance

- **Given** `webhookUrl` не пустой, **when** открыт чат, **then** баннер «Входящие не будут приходить:
  очистите webhookUrl в личном кабинете».
- **Given** `incomingWebhook = "no"`, **when** открыт чат, **then** баннер «Включите уведомления о входящих».
- **Given** пришло `stateInstanceChanged: notAuthorized`, **when** открыт чат, **then** баннер «Проблема с инстансом» с объяснением, как авторизовать инстанс.
- **Given** всё настроено, **then** баннеров нет.

## Tasks

- [x] `getSettings` в клиенте, схема ответа.
- [x] Запросы `instanceStateQueryOptions` / `instanceSettingsQueryOptions` (ключи `QueryKeys.Instance.*`; состояние обновляется уведомлением).
- [x] Компонент баннера в юните `session`.

## DoD

Тесты хука диагностики (все ветки), зелёный гейт.
