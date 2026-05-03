import { expect, test } from '@playwright/test';

test('opens the program tab', async ({ page }) => {
  await page.goto('/program');

  await expect(page.locator('body')).toContainText('Program');
  await expect(page.getByRole('link', { name: /routine/i })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
});
