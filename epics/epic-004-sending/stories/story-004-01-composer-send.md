---
id: STORY-004-01
epic: EPIC-004
title: Поле ввода и отправка
status: done
---

# STORY-004-01 — Поле ввода и отправка

**Как** оператор **хочу** написать сообщение и отправить его клавишей Enter,
**чтобы** переписываться так же быстро, как в мессенджере.

## Факты из документации GREEN-API (`SendMessage`)

- `POST {apiUrl}/waInstance{id}/sendMessage/{token}`, тело `{ "chatId": "10000000", "message": "…" }`.
- Ответ `{ "idMessage": "1763115112345" }`; сообщение ставится в очередь отправки.
- Длина: MAX — до 4000 символов, Telegram — до 4096.
- Лимит 50 запросов/с на инстанс.

## Acceptance

- **Given** текст в поле, **when** Enter, **then** `SendMessage`, поле очищено, фокус остаётся в поле.
- **Given** текст, **when** Shift+Enter, **then** перенос строки, отправки нет.
- **Given** идёт набор через IME (`isComposing`), **when** Enter, **then** отправки нет.
- **Given** длина > лимита, **then** кнопка отправки выключена, счётчик `4012 / 4000` красный.
- **Given** только пробелы, **then** кнопка выключена.
- Текст отправляется как есть (без `trim` внутри), обрезаются только пробелы по краям.

## Tasks

- [x] `sendMessage` в клиенте, схема ответа.
- [x] `useSendMessageMutation`: `onMutate` — сообщение `pending` в стор; `onSuccess` — `sent` + `idMessage`; `onError` — `failed`.
- [x] Компонент `message-composer` (Mantine `Textarea autosize`), хук `use-message-composer`.

## DoD

Компонентный тест клавиш (Enter, Shift+Enter, IME), тест мутации, зелёный гейт.
