import { Page, Locator, expect } from '@playwright/test';

/**
 * Test helpers for shadcn/ui and Radix UI components.
 * These utilities handle the portal-based rendering and ARIA patterns.
 */

/**
 * Select an option from a shadcn/ui Select component.
 * Radix Select renders options in a portal, so we need special handling.
 */
export async function selectOption(
  page: Page,
  triggerSelector: string,
  optionText: string
): Promise<void> {
  // Click the select trigger to open the dropdown
  const trigger = page.locator(triggerSelector);
  await trigger.click();

  // Wait for the portal content to appear
  // Radix renders select options in [data-radix-popper-content-wrapper]
  const popperContent = page.locator('[data-radix-popper-content-wrapper]');
  await expect(popperContent).toBeVisible({ timeout: 5000 });

  // Find and click the option by its text content
  const option = popperContent.locator(`[role="option"]:has-text("${optionText}")`);
  await option.click();

  // Wait for the popover to close
  await expect(popperContent).not.toBeVisible({ timeout: 3000 });
}

/**
 * Select an option from a shadcn/ui Select by value attribute.
 */
export async function selectOptionByValue(
  page: Page,
  triggerSelector: string,
  value: string
): Promise<void> {
  const trigger = page.locator(triggerSelector);
  await trigger.click();

  const popperContent = page.locator('[data-radix-popper-content-wrapper]');
  await expect(popperContent).toBeVisible({ timeout: 5000 });

  const option = popperContent.locator(`[role="option"][data-value="${value}"]`);
  await option.click();

  await expect(popperContent).not.toBeVisible({ timeout: 3000 });
}

/**
 * Fill a form field with label text.
 */
export async function fillFieldByLabel(
  page: Page,
  labelText: string,
  value: string
): Promise<void> {
  const label = page.locator(`label:has-text("${labelText}")`);
  const inputId = await label.getAttribute('for');

  if (inputId) {
    await page.fill(`#${inputId}`, value);
  } else {
    // Fallback: find input that's a sibling or descendant
    const input = label.locator('~ input, ~ textarea, input, textarea').first();
    await input.fill(value);
  }
}

/**
 * Click a button in a dialog.
 */
export async function clickDialogButton(
  page: Page,
  buttonText: string
): Promise<void> {
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible({ timeout: 5000 });
  await dialog.locator(`button:has-text("${buttonText}")`).click();
}

/**
 * Wait for a toast notification and verify its message.
 */
export async function expectToast(
  page: Page,
  messagePattern: string | RegExp
): Promise<void> {
  const toast = page.locator('[data-sonner-toast]').first();
  await expect(toast).toBeVisible({ timeout: 10000 });

  if (typeof messagePattern === 'string') {
    await expect(toast).toContainText(messagePattern);
  } else {
    const text = await toast.textContent();
    expect(text).toMatch(messagePattern);
  }
}

/**
 * Wait for loading states to complete.
 */
export async function waitForLoadingComplete(page: Page): Promise<void> {
  // Wait for any spinners or loading indicators to disappear
  const loadingIndicators = page.locator('[data-loading], .animate-spin, [aria-busy="true"]');

  // Use a short timeout since loading might not exist
  try {
    await loadingIndicators.first().waitFor({ state: 'hidden', timeout: 10000 });
  } catch {
    // No loading indicator found, which is fine
  }

  // Also wait for network to be idle
  await page.waitForLoadState('networkidle', { timeout: 15000 });
}

/**
 * Navigate to a sidebar menu item.
 */
export async function navigateToSidebarItem(
  page: Page,
  itemText: string
): Promise<void> {
  // On mobile, we may need to open the sidebar first
  const isMobile = (await page.viewportSize())?.width ?? 0 < 768;

  if (isMobile) {
    const hamburger = page.locator('button[aria-label*="menu"], button[aria-label*="sidebar"], [data-sidebar-trigger]');
    if (await hamburger.isVisible()) {
      await hamburger.click();
      await page.waitForTimeout(300); // Wait for animation
    }
  }

  // Find and click the sidebar link
  const sidebarLink = page.locator(`nav a:has-text("${itemText}"), [data-sidebar] a:has-text("${itemText}")`);
  await sidebarLink.click();

  await waitForLoadingComplete(page);
}

/**
 * Check if user is on the expected page by URL pattern.
 */
export async function expectPageURL(
  page: Page,
  urlPattern: string | RegExp
): Promise<void> {
  if (typeof urlPattern === 'string') {
    await expect(page).toHaveURL(new RegExp(urlPattern));
  } else {
    await expect(page).toHaveURL(urlPattern);
  }
}

/**
 * Get all visible table rows (excluding header).
 */
export function getTableRows(page: Page, tableSelector = 'table'): Locator {
  return page.locator(`${tableSelector} tbody tr`);
}

/**
 * Find a table row containing specific text.
 */
export function findTableRow(
  page: Page,
  searchText: string,
  tableSelector = 'table'
): Locator {
  return page.locator(`${tableSelector} tbody tr:has-text("${searchText}")`);
}

/**
 * Click an action button in a specific table row.
 */
export async function clickRowAction(
  page: Page,
  rowText: string,
  actionLabel: string,
  tableSelector = 'table'
): Promise<void> {
  const row = findTableRow(page, rowText, tableSelector);
  await row.locator(`button:has-text("${actionLabel}"), button[aria-label*="${actionLabel}"]`).click();
}

/**
 * Fill and submit a search input.
 */
export async function searchFor(
  page: Page,
  searchText: string,
  searchSelector = 'input[type="search"], input[placeholder*="search" i]'
): Promise<void> {
  const searchInput = page.locator(searchSelector).first();
  await searchInput.fill(searchText);

  // Trigger search - either by Enter key or waiting for debounce
  await searchInput.press('Enter');
  await page.waitForTimeout(500); // Allow debounce
  await waitForLoadingComplete(page);
}

/**
 * Check if an element exists (without failing).
 */
export async function elementExists(
  page: Page,
  selector: string
): Promise<boolean> {
  try {
    const element = page.locator(selector);
    return await element.count() > 0;
  } catch {
    return false;
  }
}

/**
 * Scroll element into view.
 */
export async function scrollIntoView(
  page: Page,
  selector: string
): Promise<void> {
  await page.locator(selector).scrollIntoViewIfNeeded();
}

/**
 * Take a named screenshot for debugging.
 */
export async function takeDebugScreenshot(
  page: Page,
  name: string
): Promise<void> {
  await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
}
