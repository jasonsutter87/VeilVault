import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Should have some content
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have correct page title', async ({ page }) => {
    await page.goto('/');

    // VeilVault should be in the title
    await expect(page).toHaveTitle(/VeilVault|Dashboard/i);
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('should not have console errors on load', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out expected/known errors
    const unexpectedErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('favicon.ico')
    );

    expect(unexpectedErrors).toHaveLength(0);
  });
});
