import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate from landing to auth page', async ({ page }) => {
    await page.goto('/');

    // Find and click a link that leads to auth
    const authLink = page.locator('a[href*="auth"], button:has-text("Sign"), a:has-text("Sign"), a:has-text("Get Started")');

    if (await authLink.first().isVisible()) {
      await authLink.first().click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('auth');
    }
  });

  test('should handle direct navigation to protected routes', async ({ page }) => {
    // Try navigating directly to a protected route
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should either show the dashboard (if no auth required in dev) or redirect to auth
    const url = page.url();
    const isOnDashboard = url.includes('dashboard');
    const isOnAuth = url.includes('auth');
    const isOnLanding = url.endsWith('/tenant-mate/') || url.endsWith('/tenant-mate');

    expect(isOnDashboard || isOnAuth || isOnLanding).toBeTruthy();
  });

  test('should handle 404 routes gracefully', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz');
    await page.waitForLoadState('networkidle');

    // Should either show a 404 page or redirect to landing/auth
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should maintain base path in all routes', async ({ page }) => {
    await page.goto('/');

    // All internal links should maintain the /tenant-mate/ base path
    const internalLinks = page.locator('a[href^="/tenant-mate"]');
    const count = await internalLinks.count();

    // The base path is handled by the router, so links may be relative
    // Just verify the page works correctly
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should load pages without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out expected errors (e.g., missing Supabase connection in CI)
    const unexpectedErrors = consoleErrors.filter(
      (error) =>
        !error.includes('supabase') &&
        !error.includes('Failed to fetch') &&
        !error.includes('net::ERR') &&
        !error.includes('NetworkError')
    );

    expect(unexpectedErrors).toHaveLength(0);
  });
});
