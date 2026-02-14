import { test, expect } from '@playwright/test';

test.describe('Scan Workflow', () => {
  test('complete scan to dashboard flow', async ({ page }) => {
    await page.goto('/');

    // Should show scan page
    await expect(
      page.getByText('Select Repositories to Analyze')
    ).toBeVisible();

    // Wait for repos to load
    await page.waitForSelector('[data-testid="repo-card"]', {
      timeout: 10000,
      state: 'visible',
    });

    // Select first repo
    await page.click('[data-testid="repo-card"]:first-child');

    // Click analyze button
    await page.click('button:has-text("Analyze Selected")');

    // Should navigate to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Work Dashboard')).toBeVisible();
  });

  test('dark mode toggle works', async ({ page }) => {
    await page.goto('/');

    // Toggle dark mode
    await page.click('[aria-label="Toggle dark mode"]');

    // Check that dark theme is applied
    const html = page.locator('html');
    await expect(html).toHaveClass(/pf-v6-theme-dark/);
  });
});
