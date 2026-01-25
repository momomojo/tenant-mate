import { test as base, expect, Page } from '@playwright/test';
import { waitForLoadingComplete } from '../utils/test-helpers';

/**
 * Test user credentials for E2E tests.
 * These should be test accounts in a staging environment.
 */
export const TEST_USERS = {
  propertyManager: {
    email: 'pm@test.com',
    password: 'testpassword123',
    firstName: 'Test',
    lastName: 'Manager',
    role: 'property_manager',
  },
  tenant: {
    email: 'tenant@test.com',
    password: 'testpassword123',
    firstName: 'Test',
    lastName: 'Tenant',
    role: 'tenant',
  },
};

/**
 * Authentication helper class for E2E tests.
 */
export class AuthHelper {
  constructor(private page: Page) {}

  /**
   * Sign up a new user.
   */
  async signUp(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: 'tenant' | 'property_manager' = 'tenant'
  ): Promise<void> {
    await this.page.goto('/auth?mode=signup');
    await this.page.waitForLoadState('networkidle');

    // Fill in signup form
    await this.page.fill('input[name="firstName"], input[placeholder*="first" i]', firstName);
    await this.page.fill('input[name="lastName"], input[placeholder*="last" i]', lastName);
    await this.page.fill('input[type="email"], input[name="email"]', email);
    await this.page.fill('input[type="password"], input[name="password"]', password);

    // Select role if dropdown exists
    const roleSelect = this.page.locator('[data-testid="role-select"], button:has-text("Tenant"), button:has-text("Role")');
    if (await roleSelect.isVisible()) {
      await roleSelect.click();
      const roleOption = this.page.locator(`[role="option"]:has-text("${role === 'property_manager' ? 'Property Manager' : 'Tenant'}")`);
      if (await roleOption.isVisible()) {
        await roleOption.click();
      }
    }

    // Submit
    await this.page.locator('button[type="submit"]:has-text("Sign Up"), button[type="submit"]:has-text("Create")').click();

    // Wait for redirect to dashboard
    await this.page.waitForURL(/dashboard/, { timeout: 15000 });
    await waitForLoadingComplete(this.page);
  }

  /**
   * Sign in with existing credentials.
   */
  async signIn(email: string, password: string): Promise<void> {
    await this.page.goto('/auth');
    await this.page.waitForLoadState('networkidle');

    // Fill in login form
    await this.page.fill('input[type="email"], input[name="email"]', email);
    await this.page.fill('input[type="password"], input[name="password"]', password);

    // Submit
    await this.page.locator('button[type="submit"]').click();

    // Wait for redirect to dashboard
    await this.page.waitForURL(/dashboard/, { timeout: 15000 });
    await waitForLoadingComplete(this.page);
  }

  /**
   * Sign out the current user.
   */
  async signOut(): Promise<void> {
    // Look for sign out button in header dropdown or sidebar
    const userMenu = this.page.locator('[data-testid="user-menu"], button[aria-label*="user" i], button[aria-label*="account" i]');

    if (await userMenu.isVisible()) {
      await userMenu.click();
      await this.page.waitForTimeout(300);
    }

    const signOutButton = this.page.locator('button:has-text("Sign Out"), button:has-text("Log Out"), a:has-text("Sign Out")');
    await signOutButton.click();

    // Wait for redirect to auth page
    await this.page.waitForURL(/auth/, { timeout: 10000 });
  }

  /**
   * Check if user is authenticated by checking URL.
   */
  async isAuthenticated(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('dashboard') || url.includes('properties') || url.includes('tenants');
  }

  /**
   * Navigate to dashboard if not already there.
   */
  async ensureOnDashboard(): Promise<void> {
    if (!this.page.url().includes('dashboard')) {
      await this.page.goto('/dashboard');
      await waitForLoadingComplete(this.page);
    }
  }
}

/**
 * Extended test fixture with auth helper.
 */
export const test = base.extend<{
  auth: AuthHelper;
  authenticatedPage: Page;
}>({
  auth: async ({ page }, use) => {
    const auth = new AuthHelper(page);
    await use(auth);
  },

  authenticatedPage: async ({ page }, use) => {
    const auth = new AuthHelper(page);

    // Try to sign in with test PM account
    try {
      await auth.signIn(TEST_USERS.propertyManager.email, TEST_USERS.propertyManager.password);
    } catch {
      // If login fails, try to sign up
      const timestamp = Date.now();
      await auth.signUp(
        `pm-${timestamp}@test.com`,
        'testpassword123',
        'Test',
        'Manager',
        'property_manager'
      );
    }

    await use(page);
  },
});

export { expect };
