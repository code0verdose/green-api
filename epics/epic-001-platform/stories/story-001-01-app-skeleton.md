---
id: STORY-001-01
epic: EPIC-001
title: Каркас приложения по канону FSD
status: done
---

# STORY-001-01 — Каркас приложения по канону FSD

**Как** разработчик проекта **хочу** готовый каркас со слоями, алиасами и проверками,
**чтобы** каждая следующая история писалась в одном стиле и ломалась на CI, а не в ревью.

## Acceptance (Given / When / Then)

- **Given** чистый клон репозитория, **when** выполняю `pnpm install && pnpm dev`,
  **then** открывается страница входа.
- **Given** код в `pages/`, **when** он импортирует `@units/chat/api/...` в обход barrel,
  **then** `pnpm lint` падает с понятным сообщением.
- **Given** любой файл в `src/`, **when** в нём `export default`, **then** линтер падает
  (кроме конфигов инструментов).
- **Given** пакет моложе 7 дней в реестре npm, **when** `pnpm install`,
  **then** он не ставится (`minimumReleaseAge`).

## Tasks

- [x] Vite, React, TypeScript strict (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`).
- [x] Алиасы `@app @pages @widgets @units @shared` в `tsconfig` и `vite`.
- [x] Mantine 9 + `postcss-preset-mantine`, CSS Modules.
- [x] TanStack Router (file-based, `routeTree.gen.ts`), TanStack Query, Zod, zustand.
- [x] ESLint flat config: границы слоёв, запрет default export и inline-стилей, `consistent-type-imports`.
- [x] Prettier, `.editorconfig`, `.nvmrc`.
- [x] Vitest + jsdom + Testing Library + MSW, пороги покрытия.
- [x] Playwright (Chromium + мобильный профиль).

## DoD

Тесты по TDD, зелёный `typecheck/lint/test/build`, зелёный commit-гейт.
