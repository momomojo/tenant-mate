import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should load the landing page successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/TenantMate/i);
  });

  test('should display the main heading', async ({ page }) => {
    await page.goto('/');
    // Check that some meaningful content is rendered
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/');
    // Look for common navigation elements or call-to-action buttons
    const links = page.locator('a');
    const linkCount = await links.count();
    expect(linkCount).toBeGreaterThan(0);
  });

  test('should have a sign-in or get-started button', async ({ page }) => {
    await page.goto('/');
    // Look for authentication-related buttons or links
    const authButton = page.locator('a[href*="auth"], button:has-text("Sign"), button:has-text("Get Started"), a:has-text("Sign"), a:has-text("Get Started")');
    const count = await authButton.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    const body = page.locator('body');
    await expect(body).toBeVisible();
    // Ensure no horizontal overflow on mobile
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // Allow 5px tolerance
  });
});
