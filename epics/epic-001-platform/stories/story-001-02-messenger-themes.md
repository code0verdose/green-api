---
id: STORY-001-02
epic: EPIC-001
title: Темы MAX и Telegram
status: done
---

# STORY-001-02 — Темы MAX и Telegram

**Как** пользователь **хочу**, чтобы чат выглядел как мой мессенджер,
**чтобы** интерфейс был привычным с первой секунды.

## Источник токенов (замер, а не по памяти)

| Токен            | MAX (web.max.ru, тема `space`, light)       | Telegram (web.telegram.org/k, light) |
| ---------------- | ------------------------------------------- | ------------------------------------ |
| Акцент           | `#007aff` (`--button-primary`)              | `#3390ec` (`--primary-color`)        |
| Основной текст   | `#060708`                                   | `#000000`                            |
| Вторичный текст  | `#060708ad`                                 | `#707579`                            |
| Фон панели       | `#ffffff` / `#f5f7fa`                       | `#ffffff` / `#f4f4f5`                |
| Входящий пузырь  | `#ffffff`                                   | `#ffffff`                            |
| Исходящий пузырь | `#e9fdff`, текст `#011c29`, время `#0784b8` | `#e3fee0`, акцент `#5ca853`          |
| Фон чата         | градиент `#99d5d7 → #80bcff`                | зелёный градиент (обои Telegram)     |
| Ошибка           | `#ff303c`                                   | `#df3f40`                            |

MAX сняты из CSS `web.max.ru` (`/_app/immutable/assets/*.css`), Telegram — через
`getComputedStyle(document.documentElement)` на `web.telegram.org/k` в светлой схеме.

## Acceptance

- **Given** выбран MAX, **when** открыт чат, **then** исходящий пузырь `#e9fdff`, акцент `#007aff`.
- **Given** выбран Telegram, **when** открыт чат, **then** исходящий пузырь `#e3fee0`, акцент `#3390ec`.
- **Given** форма входа, **when** переключаю мессенджер, **then** тема меняется сразу.

## Tasks

- [x] CSS-переменные `--gac-*` на `[data-messenger]`.
- [x] Mantine `primaryColor` по мессенджеру.
- [x] Логотипы-иконки MAX и Telegram (SVG, без внешних загрузок).

## DoD

Скриншоты обеих тем в README, зелёный гейт.
