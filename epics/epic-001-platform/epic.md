---
id: EPIC-001
title: Платформа и темы
status: review
milestone: MVP
owner: frontend
---

# EPIC-001 — Платформа и темы

## Зачем

Задать каркас, на котором остальные эпики пишутся одинаково: слои FSD, алиасы, линтер с
границами слоёв, тесты, CI. И две темы — MAX (прототип из ТЗ) и Telegram — до того, как
появятся экраны, чтобы экраны сразу брали токены, а не хардкод.

## Scope

**In:** Vite + React 19 + TypeScript strict, Mantine 9 + CSS Modules, TanStack Router/Query, Zod,
zustand; ESLint (границы слоёв, запрет default export), Prettier; Vitest + Testing Library + MSW;
Playwright; GitHub Actions (CI); токены тем MAX и Telegram. Публикация — после выдачи сервера
и домена (STORY-001-04).

**Out:** тёмная тема, i18n, Storybook.

## Acceptance

- `pnpm install && pnpm dev` поднимает приложение; `pnpm typecheck lint test build` зелёные.
- Импорт вглубь чужого юнита (`@units/chat/api/...`) — ошибка линтера.
- Атрибут `data-messenger="max|telegram"` на корне переключает все цвета без перезагрузки.

## Истории

| ID                                                       | История                                  | Статус  |
| -------------------------------------------------------- | ---------------------------------------- | ------- |
| [STORY-001-01](stories/story-001-01-app-skeleton.md)     | Каркас приложения по канону FSD          | done    |
| [STORY-001-02](stories/story-001-02-messenger-themes.md) | Темы MAX и Telegram                      | done    |
| [STORY-001-03](stories/story-001-03-ci.md)               | CI на push в main и каждый pull request  | done    |
| [STORY-001-04](stories/story-001-04-publish.md)          | Публикация на сервере и домене владельца | backlog |

## Зависимости

Нет.
