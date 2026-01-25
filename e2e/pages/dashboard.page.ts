import { Page, Locator, expect } from '@playwright/test';
import { waitForLoadingComplete, navigateToSidebarItem } from '../utils/test-helpers';

/**
 * Page Object Model for the Dashboard page.
 */
export class DashboardPage {
  readonly page: Page;
  readonly title: Locator;
  readonly statCards: Locator;
  readonly sidebar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('h1, h2').first();
    this.statCards = page.locator('[data-testid="stat-card"], .stat-card, [class*="card"]').filter({ hasText: /\d/ });
    this.sidebar = page.locator('[data-sidebar], nav, aside');
  }

  async goto(): Promise<void> {
    await this.page.goto('/dashboard');
    await waitForLoadingComplete(this.page);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/dashboard/);
    await expect(this.title).toBeVisible();
  }

  async getStatCardValue(cardTitle: string): Promise<string | null> {
    const card = this.page.locator(`[data-testid="stat-card"]:has-text("${cardTitle}"), .card:has-text("${cardTitle}")`);
    const value = card.locator('[data-testid="stat-value"], .text-2xl, .text-3xl, .font-bold').first();
    return value.textContent();
  }

  async navigateTo(menuItem: string): Promise<void> {
    await navigateToSidebarItem(this.page, menuItem);
  }

  async getSidebarItems(): Promise<string[]> {
    const links = this.sidebar.locator('a');
    const items: string[] = [];
    const count = await links.count();

    for (let i = 0; i < count; i++) {
      const text = await links.nth(i).textContent();
      if (text) items.push(text.trim());
    }

    return items;
  }

  async expectRoleBasedSidebar(role: 'tenant' | 'property_manager'): Promise<void> {
    const items = await this.getSidebarItems();

    if (role === 'property_manager') {
      // PM should see Properties, Tenants, etc.
      expect(items.some(i => i.includes('Properties'))).toBe(true);
      expect(items.some(i => i.includes('Tenants'))).toBe(true);
    } else {
      // Tenant should NOT see Properties, Tenants
      expect(items.some(i => i.includes('Properties'))).toBe(false);
      expect(items.some(i => i.includes('Tenants'))).toBe(false);
    }

    // Both roles should see these
    expect(items.some(i => i.includes('Dashboard'))).toBe(true);
    expect(items.some(i => i.includes('Maintenance'))).toBe(true);
  }
}
