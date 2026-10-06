---
id: STORY-001-03
epic: EPIC-001
title: CI на push в main и каждый pull request
status: done
---

# STORY-001-03 — CI на push в main и каждый pull request

**Как** ревьюер **хочу** видеть зелёный CI у каждого коммита,
**чтобы** доверять, что проверки из README действительно проходят, а не только на машине автора.

## Acceptance

- **Given** пуш или PR в `main`, **when** отрабатывает CI, **then** выполняются
  `typecheck`, `lint`, `format:check`, `test:coverage` (с порогами), `build`, `e2e`.
- **Given** упавший e2e, **then** отчёт Playwright доступен артефактом сборки.
- Сторонние actions закреплены полными SHA; Dependabot обновляет их с недельной выдержкой.

## Tasks

- [x] `.github/workflows/ci.yml` (две job: verify и e2e).
- [x] Закрепление actions по SHA, `.github/dependabot.yml`.

## DoD

CI зелёный на `main` после первого пуша.
