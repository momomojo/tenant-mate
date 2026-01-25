import { Page, Locator, expect } from '@playwright/test';
import { waitForLoadingComplete, selectOption, clickDialogButton, expectToast } from '../utils/test-helpers';

/**
 * Page Object Model for the Properties page.
 */
export class PropertiesPage {
  readonly page: Page;
  readonly title: Locator;
  readonly addPropertyButton: Locator;
  readonly searchInput: Locator;
  readonly propertyCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('h1:has-text("Properties"), h2:has-text("Properties")');
    this.addPropertyButton = page.locator('button:has-text("Add Property"), button:has-text("New Property")');
    this.searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    this.propertyCards = page.locator('[data-testid="property-card"], .property-card, .card:has([data-testid="property-name"])');
  }

  async goto(): Promise<void> {
    await this.page.goto('/properties');
    await waitForLoadingComplete(this.page);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/properties/);
    await expect(this.title).toBeVisible();
  }

  async addProperty(name: string, address: string, type: string = 'apartment'): Promise<void> {
    await this.addPropertyButton.click();

    // Wait for dialog
    const dialog = this.page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Fill in property details
    await dialog.locator('input[name="name"], input[placeholder*="name" i]').fill(name);
    await dialog.locator('input[name="address"], input[placeholder*="address" i]').fill(address);

    // Select property type using the Radix Select helper
    const typeSelect = dialog.locator('button[role="combobox"], [data-testid="type-select"]');
    if (await typeSelect.isVisible()) {
      await selectOption(this.page, 'button[role="combobox"]', type);
    }

    // Submit
    await clickDialogButton(this.page, 'Add');

    // Wait for success
    await expectToast(this.page, /added|created|success/i);
    await waitForLoadingComplete(this.page);
  }

  async searchProperties(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Debounce
    await waitForLoadingComplete(this.page);
  }

  async getPropertyCount(): Promise<number> {
    return this.propertyCards.count();
  }

  async clickProperty(propertyName: string): Promise<void> {
    const card = this.page.locator(`.card:has-text("${propertyName}")`);
    await card.click();
    await this.page.waitForURL(/properties\/[^/]+$/);
    await waitForLoadingComplete(this.page);
  }

  async expectPropertyVisible(propertyName: string): Promise<void> {
    const card = this.page.locator(`.card:has-text("${propertyName}")`);
    await expect(card).toBeVisible();
  }

  async expectEmptyState(): Promise<void> {
    const emptyState = this.page.locator('text=/no properties|add your first/i');
    await expect(emptyState).toBeVisible();
  }
}

/**
 * Page Object Model for the Property Details page.
 */
export class PropertyDetailsPage {
  readonly page: Page;
  readonly title: Locator;
  readonly addUnitButton: Locator;
  readonly unitsTable: Locator;
  readonly backButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('h1, h2').first();
    this.addUnitButton = page.locator('button:has-text("Add Unit"), button:has-text("New Unit")');
    this.unitsTable = page.locator('table');
    this.backButton = page.locator('button:has-text("Back"), a:has-text("Back"), button[aria-label*="back" i]');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/properties\/[^/]+$/);
  }

  async addUnit(unitNumber: string, monthlyRent: string): Promise<void> {
    await this.addUnitButton.click();

    const dialog = this.page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await dialog.locator('input[name="unit_number"], input[placeholder*="unit" i]').fill(unitNumber);
    await dialog.locator('input[name="monthly_rent"], input[placeholder*="rent" i]').fill(monthlyRent);

    await clickDialogButton(this.page, 'Add');
    await expectToast(this.page, /added|created|success/i);
    await waitForLoadingComplete(this.page);
  }

  async getUnitCount(): Promise<number> {
    const rows = this.unitsTable.locator('tbody tr');
    return rows.count();
  }

  async assignTenantToUnit(unitNumber: string, tenantEmail: string): Promise<void> {
    const row = this.unitsTable.locator(`tbody tr:has-text("${unitNumber}")`);
    const assignButton = row.locator('button:has-text("Assign"), button[aria-label*="assign" i]');
    await assignButton.click();

    const dialog = this.page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select tenant from dropdown
    const tenantSelect = dialog.locator('button[role="combobox"]');
    if (await tenantSelect.isVisible()) {
      await tenantSelect.click();
      const popperContent = this.page.locator('[data-radix-popper-content-wrapper]');
      await expect(popperContent).toBeVisible();
      const option = popperContent.locator(`[role="option"]:has-text("${tenantEmail}")`);
      await option.click();
    }

    await clickDialogButton(this.page, 'Assign');
    await expectToast(this.page, /assigned|success/i);
    await waitForLoadingComplete(this.page);
  }

  async goBack(): Promise<void> {
    await this.backButton.click();
    await this.page.waitForURL(/properties$/);
    await waitForLoadingComplete(this.page);
  }
}
