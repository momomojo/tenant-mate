import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for TenantMate.
 *
 * Key features:
 * - Proper handling of shadcn/ui (Radix) components via page objects
 * - Extended timeouts for Supabase operations
 * - Automatic retries in CI
 * - Screenshots and traces for debugging
 *
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github'], ['list']]
    : [['html', { open: 'on-failure' }], ['list']],
  timeout: 60000, // Increased for Supabase operations
  expect: {
    timeout: 15000, // Increased for async data loading
  },

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL
      || (process.env.CI
        ? 'http://localhost:4173/tenant-mate/'
        : 'http://localhost:8080/tenant-mate/'),
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Better handling of slow networks
    actionTimeout: 15000,
    navigationTimeout: 30000,
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
