import { test, expect } from './fixtures/auth.fixture';
import { DashboardPage } from './pages/dashboard.page';

test.describe('Dashboard', () => {
  test('should display the property manager dashboard after login', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    await dashboard.expectLoaded();

    // Check that stat cards are visible
    const cards = await dashboard.statCards.count();
    expect(cards).toBeGreaterThan(0);
  });

  test('should show role-appropriate sidebar navigation', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();

    // PM should see Properties, Tenants, etc.
    await dashboard.expectRoleBasedSidebar('property_manager');
  });

  test('should navigate to properties from sidebar', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();

    await dashboard.navigateTo('Properties');
    await expect(authenticatedPage).toHaveURL(/properties/);
  });

  test('should navigate to maintenance from sidebar', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();

    await dashboard.navigateTo('Maintenance');
    await expect(authenticatedPage).toHaveURL(/maintenance/);
  });

  test('should show dashboard title', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();

    await expect(dashboard.title).toContainText(/dashboard/i);
  });
});
