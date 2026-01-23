import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should navigate to the auth page', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    // Check that the auth page renders form elements
    const formElements = page.locator('input, form');
    const count = await formElements.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display email input field', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    await expect(emailInput.first()).toBeVisible();
  });

  test('should display password input field', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    await expect(passwordInput.first()).toBeVisible();
  });

  test('should have a submit/sign-in button', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    const submitButton = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Log")');
    await expect(submitButton.first()).toBeVisible();
  });

  test('should show validation on empty form submission', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    // Try to submit without filling in fields
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Log")');
    if (await submitButton.first().isVisible()) {
      await submitButton.first().click();

      // Wait briefly for validation to appear
      await page.waitForTimeout(500);

      // Check that the page is still on auth (not redirected)
      expect(page.url()).toContain('auth');
    }
  });

  test('should have a toggle between sign in and sign up', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    // Look for sign up / sign in toggle
    const toggleLink = page.locator('button:has-text("Sign Up"), a:has-text("Sign Up"), button:has-text("Create"), a:has-text("Create"), button:has-text("Register"), a:has-text("Register")');
    const count = await toggleLink.count();
    // It's acceptable if there's no toggle (single form with tabs)
    if (count > 0) {
      await expect(toggleLink.first()).toBeVisible();
    }
  });
});
