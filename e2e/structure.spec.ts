import { expect, test, type Page } from '@playwright/test';

async function prepareApp(page: Page) {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
    localStorage.setItem('traindaily_sessions', JSON.stringify({
      '2026-05-11': {
        logged_at: '2026-05-11T10:00:00.000Z',
        started_at: '2026-05-11T09:30:00.000Z',
        week_number: 1,
        workout_type: 'push_a',
        cable_lateral_raise: [{ reps: 12, weight: 5, rir: 2 }],
      },
    }));
  });
}

async function expectSingleVisibleMain(page: Page) {
  await expect(page.locator('main:visible')).toHaveCount(1);
}

async function expectNoNestedInteractiveRoots(page: Page) {
  const nested = await page.locator([
    'a a',
    'a button',
    'button a',
    'button button',
    'summary a',
    'summary button',
  ].join(',')).count();

  expect(nested).toBe(0);
}

test('major routes use one main landmark and avoid nested interactive roots', async ({ page }) => {
  await prepareApp(page);

  for (const route of ['/', '/program', '/muscles', '/history', '/settings', '/sync']) {
    await page.goto(route);
    await expectSingleVisibleMain(page);
    await expectNoNestedInteractiveRoots(page);
  }
});

test('mobile footer actions stay inside the viewport', async ({ page }) => {
  await prepareApp(page);

  await page.goto('/');
  await expect(page.getByRole('link', { name: /options/i })).toBeInViewport();

  await page.goto('/settings');
  await expect(page.getByRole('switch', { name: /trace mode/i })).toBeInViewport();

  await page.goto('/sync');
  await expect(page.locator('summary').filter({ hasText: 'Direction' })).toBeInViewport();
});

test('today actions remain reachable in a compressed mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 560 });
  await prepareApp(page);

  await page.goto('/');

  await expect(page.getByRole('button', { name: /^start$/i })).toBeInViewport();
  const optionsLink = page.getByRole('link', { name: /options/i });
  await optionsLink.scrollIntoViewIfNeeded();
  await expect(optionsLink).toBeInViewport();
});
