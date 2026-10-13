import { defineConfig, devices } from '@playwright/test';

/**
 * P13.1 — the core-flow e2e the SOW asks for before go-live.
 *
 * These drive a real browser against a running web app and a running API, so
 * they catch what the component tests cannot: a route that 404s, a permission
 * the server grants and the screen hides, a number that renders a day early
 * because of a timezone. They do not replace the Jest e2e suite, which proves
 * the books; they prove the app is usable end to end.
 *
 * They need a seeded account, which is why they are not part of `pnpm test`:
 * a password belongs in nobody's repository. Set `E2E_EMAIL` and
 * `E2E_PASSWORD` (see docs/10-testing.md) and run `pnpm e2e` from `web/`.
 * Without them the suite skips rather than fails, so a machine that has not
 * been set up does not look broken.
 */
export default defineConfig({
  testDir: './e2e',
  // Serial: these share one seeded company, and parallel runs would race over
  // the same stock and the same voucher sequence.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  /**
   * Generous on purpose. Against a dev server Next compiles each route the
   * first time it is visited, so a walk through eight modules spends most of
   * its time in the bundler rather than in the app. A tighter budget here
   * would fail for a reason that has nothing to do with the software.
   */
  timeout: 180_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
