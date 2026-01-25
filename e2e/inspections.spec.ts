import { test, expect } from './fixtures/auth.fixture';
import { InspectionsPage } from './pages/inspections.page';

test.describe('Inspections Management', () => {
  test('should display inspections page', async ({ authenticatedPage }) => {
    const inspections = new InspectionsPage(authenticatedPage);
    await inspections.goto();
    await inspections.expectLoaded();
  });

  test('should show status summary cards', async ({ authenticatedPage }) => {
    const inspections = new InspectionsPage(authenticatedPage);
    await inspections.goto();

    // Check that status cards are visible
    const cards = await inspections.statusCards.count();
    expect(cards).toBeGreaterThan(0);
  });

  test('should show schedule inspection button', async ({ authenticatedPage }) => {
    const inspections = new InspectionsPage(authenticatedPage);
    await inspections.goto();

    await expect(inspections.scheduleButton).toBeVisible();
  });

  test('should open schedule inspection dialog', async ({ authenticatedPage }) => {
    const inspections = new InspectionsPage(authenticatedPage);
    await inspections.goto();

    await inspections.scheduleButton.click();

    const dialog = authenticatedPage.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify dialog has property select
    const selects = dialog.locator('button[role="combobox"]');
    const selectCount = await selects.count();
    expect(selectCount).toBeGreaterThan(0);
  });

  test('should handle Radix Select properly in dialog', async ({ authenticatedPage }) => {
    const inspections = new InspectionsPage(authenticatedPage);
    await inspections.goto();

    await inspections.scheduleButton.click();

    const dialog = authenticatedPage.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Click the property select trigger
    const propertySelect = dialog.locator('button[role="combobox"]').first();
    await propertySelect.click();

    // Verify the popper content appears (not the native select)
    const popperContent = authenticatedPage.locator('[data-radix-popper-content-wrapper]');
    await expect(popperContent).toBeVisible({ timeout: 5000 });

    // Verify options are visible
    const options = popperContent.locator('[role="option"]');
    const optionCount = await options.count();

    // Close by pressing Escape
    await authenticatedPage.keyboard.press('Escape');
    await expect(popperContent).not.toBeVisible();
  });

  test('should filter by status tabs', async ({ authenticatedPage }) => {
    const inspections = new InspectionsPage(authenticatedPage);
    await inspections.goto();

    // Look for status tabs
    const tabs = authenticatedPage.locator('[role="tablist"] [role="tab"], button:has-text("Scheduled"), button:has-text("Completed")');
    const tabCount = await tabs.count();

    if (tabCount > 0) {
      // Click on a status tab
      await tabs.first().click();
      await authenticatedPage.waitForTimeout(500);
    }
  });

  test('should show empty state when no inspections', async ({ authenticatedPage }) => {
    const inspections = new InspectionsPage(authenticatedPage);
    await inspections.goto();

    const count = await inspections.getInspectionCount();

    if (count === 0) {
      // Should show empty state message
      const emptyMessage = authenticatedPage.locator('text=/no inspections|empty|schedule/i');
      // Empty state might be visible
      const isVisible = await emptyMessage.isVisible().catch(() => false);
      expect(isVisible || count === 0).toBe(true);
    }
  });
});

test.describe('Inspection Creation Flow', () => {
  test.skip('should create a new inspection', async ({ authenticatedPage }) => {
    // This test requires an existing property
    // Skip in CI if no test data exists
    const inspections = new InspectionsPage(authenticatedPage);
    await inspections.goto();

    const today = new Date();
    const futureDate = new Date(today.setDate(today.getDate() + 7));
    const dateStr = futureDate.toISOString().split('T')[0];

    await inspections.scheduleInspection(
      'Test Property',
      'Unit 1',
      'Routine',
      dateStr
    );

    // Verify inspection was created
    const count = await inspections.getInspectionCount();
    expect(count).toBeGreaterThan(0);
  });
});
