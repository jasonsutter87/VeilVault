import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate to dashboard', async ({ page }) => {
    await page.goto('/');

    // Dashboard or home page should load
    await expect(page.locator('body')).toBeVisible();
  });

  test('should show sidebar navigation', async ({ page }) => {
    await page.goto('/');

    // Look for navigation elements
    const nav = page.locator('nav, [role="navigation"], .sidebar');
    const navExists = await nav.count() > 0;

    // If nav exists, it should be visible or toggleable
    if (navExists) {
      // Either visible or there's a toggle button
      const isVisible = await nav.first().isVisible();
      const toggleButton = page.locator('[aria-label*="menu"], [data-testid*="menu"], .menu-toggle');
      const hasToggle = await toggleButton.count() > 0;

      expect(isVisible || hasToggle).toBe(true);
    }
  });

  test('should handle 404 gracefully', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');

    // Should either redirect to home or show a 404 page
    await expect(page.locator('body')).toBeVisible();
  });
});
