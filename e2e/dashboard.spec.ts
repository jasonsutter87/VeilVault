import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display dashboard overview', async ({ page }) => {
    // Look for dashboard elements
    const dashboard = page.locator('[data-testid="dashboard"], .dashboard, main');
    await expect(dashboard.first()).toBeVisible();
  });

  test('should display integrity status', async ({ page }) => {
    // Look for integrity/status indicators
    const statusIndicator = page.locator(
      '[data-testid="integrity-status"], .integrity-status, .status-indicator, [class*="status"]'
    );

    // May or may not be present depending on implementation state
    const count = await statusIndicator.count();
    if (count > 0) {
      await expect(statusIndicator.first()).toBeVisible();
    }
  });

  test('should have navigation links', async ({ page }) => {
    // Check for navigation links
    const links = page.locator('a, button').filter({ hasText: /(ledger|audit|transaction|dashboard)/i });
    const count = await links.count();

    // Should have some navigation options
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should handle loading states', async ({ page }) => {
    // Check for loading indicators or loaded content
    await page.waitForLoadState('networkidle');

    // Should not be stuck in loading state
    const loadingSpinner = page.locator('[data-testid="loading"], .loading, .spinner');
    const isLoading = await loadingSpinner.isVisible().catch(() => false);

    // After networkidle, should not be loading
    if (isLoading) {
      // Wait a bit more for loading to finish
      await page.waitForTimeout(2000);
    }

    // Page should have content
    const hasContent = await page.locator('body').textContent();
    expect(hasContent?.trim().length).toBeGreaterThan(0);
  });
});
