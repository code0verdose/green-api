import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const isCI = Boolean(process.env.CI);

/**
 * E2E runs against the production build (`vite preview`), so the strict CSP is exercised too.
 * Build first: `pnpm e2e` does it.
 * GREEN-API is faked per test with page.route — see e2e/support/fake-green-api.ts.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  // The build is a separate step (`pnpm e2e` runs it first). The server is the vite binary itself:
  // a `pnpm …` wrapper leaves an orphaned preview process that Playwright waits for forever.
  webServer: {
    command: `node_modules/.bin/vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    // Never reuse: a leftover server would silently test a stale build.
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
