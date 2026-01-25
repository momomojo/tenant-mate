import { Page, Locator, expect } from '@playwright/test';
import { waitForLoadingComplete, selectOption, clickDialogButton, expectToast } from '../utils/test-helpers';

/**
 * Page Object Model for the Inspections page.
 */
export class InspectionsPage {
  readonly page: Page;
  readonly title: Locator;
  readonly scheduleButton: Locator;
  readonly statusCards: Locator;
  readonly inspectionsList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('h1:has-text("Inspections"), h2:has-text("Inspections")');
    this.scheduleButton = page.locator('button:has-text("Schedule"), button:has-text("New Inspection")');
    this.statusCards = page.locator('[data-testid="status-card"], .stat-card');
    this.inspectionsList = page.locator('[data-testid="inspections-list"], .inspections-list, table, .card:has([data-testid="inspection-item"])');
  }

  async goto(): Promise<void> {
    await this.page.goto('/inspections');
    await waitForLoadingComplete(this.page);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/inspections/);
    await expect(this.title).toBeVisible();
  }

  async getStatusCardValue(status: string): Promise<string | null> {
    const card = this.statusCards.filter({ hasText: new RegExp(status, 'i') });
    const value = card.locator('.text-2xl, .text-3xl, .font-bold').first();
    return value.textContent();
  }

  async scheduleInspection(
    propertyName: string,
    unitNumber: string,
    type: string,
    date: string
  ): Promise<void> {
    await this.scheduleButton.click();

    const dialog = this.page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select property - using Radix Select properly
    const propertyTrigger = dialog.locator('button[role="combobox"]').first();
    await propertyTrigger.click();

    // Wait for the Radix popper to appear
    const popperContent = this.page.locator('[data-radix-popper-content-wrapper]');
    await expect(popperContent).toBeVisible({ timeout: 5000 });

    // Click the property option
    const propertyOption = popperContent.locator(`[role="option"]:has-text("${propertyName}")`);
    await propertyOption.click();

    // Wait for popper to close before continuing
    await expect(popperContent).not.toBeVisible({ timeout: 3000 });

    // Select unit if available
    const unitTrigger = dialog.locator('button[role="combobox"]').nth(1);
    if (await unitTrigger.isVisible()) {
      await unitTrigger.click();
      const unitPopper = this.page.locator('[data-radix-popper-content-wrapper]');
      await expect(unitPopper).toBeVisible({ timeout: 5000 });
      const unitOption = unitPopper.locator(`[role="option"]:has-text("${unitNumber}")`);
      if (await unitOption.isVisible()) {
        await unitOption.click();
        await expect(unitPopper).not.toBeVisible({ timeout: 3000 });
      }
    }

    // Select inspection type
    const typeTrigger = dialog.locator('button[role="combobox"]').last();
    await typeTrigger.click();
    const typePopper = this.page.locator('[data-radix-popper-content-wrapper]');
    await expect(typePopper).toBeVisible({ timeout: 5000 });
    const typeOption = typePopper.locator(`[role="option"]:has-text("${type}")`);
    await typeOption.click();
    await expect(typePopper).not.toBeVisible({ timeout: 3000 });

    // Fill date
    const dateInput = dialog.locator('input[type="date"], input[name="date"]');
    if (await dateInput.isVisible()) {
      await dateInput.fill(date);
    } else {
      // May use a date picker
      const dateButton = dialog.locator('button:has-text("Pick a date"), [data-testid="date-picker"]');
      if (await dateButton.isVisible()) {
        await dateButton.click();
        // Handle date picker - click on a day
        const dayButton = this.page.locator(`[role="gridcell"]:has-text("15")`).first();
        if (await dayButton.isVisible()) {
          await dayButton.click();
        }
      }
    }

    // Submit
    await clickDialogButton(this.page, 'Schedule');
    await expectToast(this.page, /scheduled|created|success/i);
    await waitForLoadingComplete(this.page);
  }

  async filterByProperty(propertyName: string): Promise<void> {
    const propertyFilter = this.page.locator('button[role="combobox"]:near(:text("Property"))').first();
    if (await propertyFilter.isVisible()) {
      await propertyFilter.click();
      const popper = this.page.locator('[data-radix-popper-content-wrapper]');
      await expect(popper).toBeVisible();
      await popper.locator(`[role="option"]:has-text("${propertyName}")`).click();
      await waitForLoadingComplete(this.page);
    }
  }

  async filterByStatus(status: string): Promise<void> {
    const statusTab = this.page.locator(`[role="tab"]:has-text("${status}"), button:has-text("${status}")`);
    if (await statusTab.isVisible()) {
      await statusTab.click();
      await waitForLoadingComplete(this.page);
    }
  }

  async getInspectionCount(): Promise<number> {
    const items = this.page.locator('[data-testid="inspection-item"], .inspection-card, table tbody tr');
    return items.count();
  }

  async expectEmptyState(): Promise<void> {
    const emptyState = this.page.locator('text=/no inspections|schedule your first/i');
    await expect(emptyState).toBeVisible();
  }
}
