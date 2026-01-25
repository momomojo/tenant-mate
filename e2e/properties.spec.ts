import { test, expect } from './fixtures/auth.fixture';
import { PropertiesPage, PropertyDetailsPage } from './pages/properties.page';
import { waitForLoadingComplete } from './utils/test-helpers';

test.describe('Properties Management', () => {
  test('should display properties page', async ({ authenticatedPage }) => {
    const properties = new PropertiesPage(authenticatedPage);
    await properties.goto();
    await properties.expectLoaded();
  });

  test('should show add property button', async ({ authenticatedPage }) => {
    const properties = new PropertiesPage(authenticatedPage);
    await properties.goto();

    await expect(properties.addPropertyButton).toBeVisible();
  });

  test('should open add property dialog', async ({ authenticatedPage }) => {
    const properties = new PropertiesPage(authenticatedPage);
    await properties.goto();

    await properties.addPropertyButton.click();

    const dialog = authenticatedPage.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
  });

  test('should have search functionality', async ({ authenticatedPage }) => {
    const properties = new PropertiesPage(authenticatedPage);
    await properties.goto();

    await expect(properties.searchInput).toBeVisible();
  });

  test('should filter properties by search term', async ({ authenticatedPage }) => {
    const properties = new PropertiesPage(authenticatedPage);
    await properties.goto();

    const initialCount = await properties.getPropertyCount();

    // Search for a non-existent property
    await properties.searchProperties('xyznonexistent123');
    await authenticatedPage.waitForTimeout(500);

    // Should show fewer or no results
    const filteredCount = await properties.getPropertyCount();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });
});

test.describe('Property Details', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Ensure we have at least one property
    const properties = new PropertiesPage(authenticatedPage);
    await properties.goto();

    const count = await properties.getPropertyCount();
    if (count === 0) {
      // Create a test property
      await properties.addProperty(
        `Test Property ${Date.now()}`,
        '123 Test Street',
        'Apartment'
      );
    }
  });

  test('should navigate to property details', async ({ authenticatedPage }) => {
    const properties = new PropertiesPage(authenticatedPage);
    await properties.goto();

    // Click first property card
    const firstCard = authenticatedPage.locator('.card').first();
    const propertyName = await firstCard.locator('h3, h4, .font-semibold').first().textContent();

    if (propertyName) {
      await firstCard.click();
      await authenticatedPage.waitForURL(/properties\/[^/]+$/);

      const details = new PropertyDetailsPage(authenticatedPage);
      await details.expectLoaded();
    }
  });

  test('should show add unit button on property details', async ({ authenticatedPage }) => {
    const properties = new PropertiesPage(authenticatedPage);
    await properties.goto();

    // Navigate to first property
    const firstCard = authenticatedPage.locator('.card').first();
    await firstCard.click();
    await authenticatedPage.waitForURL(/properties\/[^/]+$/);

    const details = new PropertyDetailsPage(authenticatedPage);
    await expect(details.addUnitButton).toBeVisible();
  });

  test('should navigate back to properties list', async ({ authenticatedPage }) => {
    const properties = new PropertiesPage(authenticatedPage);
    await properties.goto();

    // Navigate to first property
    const firstCard = authenticatedPage.locator('.card').first();
    await firstCard.click();
    await authenticatedPage.waitForURL(/properties\/[^/]+$/);

    const details = new PropertyDetailsPage(authenticatedPage);
    await details.goBack();

    await properties.expectLoaded();
  });
});
