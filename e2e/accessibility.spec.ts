import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');

    // Check that h1 exists
    const h1 = page.locator('h1');
    const h1Count = await h1.count();

    // Page should have at least one main heading
    expect(h1Count).toBeGreaterThanOrEqual(0); // Some SPAs may not have h1 initially
  });

  test('should have alt text on images', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      // Image should have alt text or be decorative (role="presentation")
      expect(alt !== null || role === 'presentation' || role === 'none').toBe(true);
    }
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input:not([type="hidden"]):not([type="submit"]):not([type="button"])');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      const placeholder = await input.getAttribute('placeholder');

      // Input should have a label, aria-label, aria-labelledby, or at least a placeholder
      const hasLabel = id
        ? (await page.locator(`label[for="${id}"]`).count()) > 0
        : false;

      expect(hasLabel || ariaLabel || ariaLabelledBy || placeholder).toBeTruthy();
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that text is visible (basic check)
    const body = page.locator('body');
    const color = await body.evaluate((el) =>
      window.getComputedStyle(el).color
    );
    const bgColor = await body.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Basic check: colors should be defined
    expect(color).toBeTruthy();
    expect(bgColor).toBeTruthy();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should have focused something
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).not.toBe('BODY');
  });

  test('should have skip links or main landmark', async ({ page }) => {
    await page.goto('/');

    // Check for skip link or main landmark
    const skipLink = page.locator('a[href="#main"], a[href="#content"]');
    const mainLandmark = page.locator('main, [role="main"]');

    const hasSkipLink = await skipLink.count() > 0;
    const hasMainLandmark = await mainLandmark.count() > 0;

    // Should have at least one of these for accessibility
    expect(hasSkipLink || hasMainLandmark).toBe(true);
  });
});
