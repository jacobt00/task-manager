import { defineConfig } from '@playwright/test';

/**
 * Two projects:
 * - "main" runs every test except the rate-limit test.
 * - "rate-limit" runs TC-061 last, because it deliberately gets the test
 *   client blocked from logging in for an unknown length of time.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL,
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: 'main', grepInvert: /@rate-limit/ },
    { name: 'rate-limit', grep: /@rate-limit/, dependencies: ['main'] },
  ],
});
