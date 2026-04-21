import { defineConfig, devices } from '@playwright/test';

/**
 * AgroPrix E2E — Playwright config.
 *
 * Cibles par defaut : prod Vercel + prod Railway. Override via env vars :
 *   BASE_URL   -> frontend (ex: http://localhost:3000 pour dev local)
 *   API_BASE   -> backend  (ex: http://localhost:8000)
 *
 * Les tests sont non-destructifs (lecture seule, pas de creation de compte
 * ni de paiement). Le scenario FedaPay sandbox est skippe tant que
 * FEDAPAY_SANDBOX_KEY n'est pas defini dans l'env CI.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.BASE_URL || 'https://app.agroprix.app',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: false,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
