import { expect, test } from '@playwright/test';

test.describe('offline-first app shell', () => {
  test.skip(process.env.PWA_E2E !== '1', 'Offline coverage requires the production service worker.');
  test.setTimeout(120_000);

  test('keeps the core app usable after the first online load', async ({ page, context }) => {
    await page.addInitScript(() => {
    });

    await page.goto('/');
    await expect(page.locator('[data-offline-ready="true"]')).toBeAttached({ timeout: 90_000 });

    await context.setOffline(true);

    for (const route of ['/', '/program', '/progress', '/history', '/settings', '/exercises/cable_lateral_raise']) {
      await page.goto(route);
      await expect(page.locator('main:visible')).toHaveCount(1);
    }
  });
});
