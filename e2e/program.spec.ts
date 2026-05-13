import { expect, test, type Page } from '@playwright/test';

async function installRequiredNotificationStack(page: Page) {
  await page.addInitScript(() => {
    class TestNotification {
      static permission: NotificationPermission = 'granted';
      static requestPermission = async () => 'granted' as NotificationPermission;
    }

    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: TestNotification,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          showNotification: async () => undefined,
        }),
      },
    });
  });
}

test('opens the program screen', async ({ page }) => {
  await page.goto('/program');

  await expect(page.locator('body')).toContainText('Program');
  await expect(page.getByRole('link', { name: /^routine/i })).toBeVisible();
  await expect(page.locator('body')).toContainText(/Next|Hold course|Add|Deload/);
  await expect(page.locator('body')).toContainText(/SMV Hypertrophy|Routine/);
  await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
});

test('today is the watch-style hub for app sections', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-05-11T10:00:00'));
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
  });

  await page.goto('/');

  await expect(page.getByRole('link', { name: /program/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /progress/i })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
});

test('shows adaptive progress detail metrics', async ({ page }) => {
  await page.goto('/history/detail');

  await expect(page.locator('body')).toContainText('Progress Detail');
  await expect(page.locator('body')).toContainText('Volume');
  await expect(page.locator('body')).toContainText(/score|recovery|load/i);
});

test('restores an active workout after reload', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-05-11T10:00:00'));
  await installRequiredNotificationStack(page);
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('liftday_active_workout_draft');
    localStorage.removeItem('traindaily_sessions');
    localStorage.removeItem('traindaily_first_session');
  });
  await page.reload();

  await page.getByRole('button', { name: /^start$/i }).click();
  await expect(page.getByRole('button', { name: /log set/i })).toBeVisible();
  await expect(page.getByRole('button', { name: '2 RIR' })).toBeVisible();

  await page.getByRole('button', { name: /log set/i }).click();
  await expect(page.getByText(/resting/i)).toBeVisible();

  await page.reload();
  await expect(page.getByText(/resting/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /undo last set/i })).toBeVisible();
});

test('shows inline previous set coaching without overlapping log action on watch viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.clock.setFixedTime(new Date('2026-05-11T10:00:00'));
  await installRequiredNotificationStack(page);
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
    localStorage.setItem('traindaily_sessions', JSON.stringify({
      '2026-05-04': {
        logged_at: '2026-05-04T10:00:00.000Z',
        week_number: 1,
        workout_type: 'push_a',
        db_incline_press: [
          { reps: 10, weight: 10, rir: 2 },
          { reps: 10, weight: 10, rir: 2 },
          { reps: 10, weight: 10, rir: 2 },
        ],
      },
    }));
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('liftday_active_workout_draft');
  });
  await page.reload();

  await page.getByRole('button', { name: /^start$/i }).click();

  const previousRow = page.getByText(/^Prev 10kg x 10$/);
  const logSet = page.getByRole('button', { name: /log set/i });
  await expect(previousRow).toBeVisible();
  await expect(logSet).toBeVisible();

  const previousBox = await previousRow.boundingBox();
  const logBox = await logSet.boundingBox();
  expect(previousBox).not.toBeNull();
  expect(logBox).not.toBeNull();
  expect(previousBox!.y + previousBox!.height).toBeLessThan(logBox!.y);

  await page.getByRole('button', { name: '4 RIR' }).click();
  await expect(page.getByText('Too easy')).toBeVisible();
});

test('logs an SMV workout with RIR and occupied-machine deferral', async ({ page }) => {
  test.setTimeout(90000);
  await page.clock.setFixedTime(new Date('2026-05-11T10:00:00'));
  await installRequiredNotificationStack(page);
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
  });

  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('liftday_active_workout_draft');
    localStorage.removeItem('traindaily_sessions');
    localStorage.removeItem('traindaily_first_session');
  });
  await page.reload();

  await expect(page.locator('body')).toContainText(/Push|Pull|Legs|Delts/i);
  await page.getByRole('button', { name: /^start$/i }).click();
  await expect(page.getByRole('button', { name: /log set/i })).toBeVisible();

  const occupied = page.getByRole('button', { name: /machine occupied/i });
  if (await occupied.isVisible()) {
    const currentExerciseName = await page.locator('h2').first().innerText();
    await occupied.click();
    const picker = page.getByRole('dialog', { name: /choose swap/i });
    await expect(picker).toBeHidden();
    await expect.poll(async () => page.locator('h2').first().innerText()).not.toBe(currentExerciseName);
  }

  for (let i = 0; i < 80; i += 1) {
    if (await page.getByText(/workout complete|done/i).first().isVisible().catch(() => false)) break;
    if (await page.getByRole('button', { name: /log set/i }).isVisible().catch(() => false)) {
      await page.getByRole('button', { name: '2 RIR' }).click({ force: true });
      await page.getByRole('button', { name: /log set/i }).click({ force: true });
      await page.waitForTimeout(750);
      continue;
    }
    if (await page.getByRole('button', { name: /skip rest/i }).isVisible().catch(() => false)) {
      await page.getByRole('button', { name: /skip rest/i }).click({ force: true });
      await page.waitForTimeout(100);
      continue;
    }
    if (await page.getByText(/next up/i).isVisible().catch(() => false)) {
      await page.getByRole('button', { name: /^start$/i }).click({ force: true });
      await page.waitForTimeout(100);
      continue;
    }
    await page.waitForTimeout(250);
  }

  await expect(page.locator('body')).toContainText(/complete|done/i);
  await page.goto('/history');
  await expect(page.locator('body')).toContainText(/Progress|Session/i);
});
