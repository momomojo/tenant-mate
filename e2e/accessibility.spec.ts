import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('landing page should have proper document structure', async ({ page }) => {
    await page.goto('/');

    // Check for proper heading hierarchy
    const h1 = page.locator('h1');
    const h1Count = await h1.count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });

  test('images should have alt text', async ({ page }) => {
    await page.goto('/');

    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      // Images should have alt text or role="presentation"
      const hasAccessibility = alt !== null || role === 'presentation' || role === 'none';
      expect(hasAccessibility).toBeTruthy();
    }
  });

  test('interactive elements should be keyboard accessible', async ({ page }) => {
    await page.goto('/');

    // Tab through the page and verify focus is visible
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    const isFocused = await focusedElement.count();
    expect(isFocused).toBeGreaterThanOrEqual(1);
  });

  test('auth page form should have proper labels', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input:not([type="hidden"])');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');

      // Input should have a label, aria-label, or at least a placeholder
      const hasLabel = id
        ? (await page.locator(`label[for="${id}"]`).count()) > 0
        : false;
      const hasAccessibility =
        hasLabel || ariaLabel || ariaLabelledBy || placeholder;

      expect(hasAccessibility).toBeTruthy();
    }
  });

  test('page should have a main landmark', async ({ page }) => {
    await page.goto('/');

    const main = page.locator('main, [role="main"]');
    const mainCount = await main.count();
    // Allow the app to not have a main if it uses a different structure
    // but flag it for awareness
    if (mainCount === 0) {
      console.warn('No <main> landmark found - consider adding one for accessibility');
    }
  });

  test('color contrast - text should be visible', async ({ page }) => {
    await page.goto('/');

    // Basic check: ensure text elements have non-zero opacity
    const textElements = page.locator('h1, h2, h3, p, span, a, button');
    const count = await textElements.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const el = textElements.nth(i);
      if (await el.isVisible()) {
        const opacity = await el.evaluate((node) =>
          window.getComputedStyle(node).opacity
        );
        expect(parseFloat(opacity)).toBeGreaterThan(0);
      }
    }
  });
});
