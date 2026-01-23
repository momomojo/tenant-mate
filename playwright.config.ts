import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for TenantMate.
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],
  timeout: 30000,
  expect: {
    timeout: 10000,
  },

  use: {
    baseURL: process.env.CI
      ? 'http://localhost:4173/tenant-mate/'
      : 'http://localhost:8080/tenant-mate/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: process.env.CI
      ? 'bunx vite preview --port 4173'
      : 'bun run dev',
    port: process.env.CI ? 4173 : 8080,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
