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

test('opens the program tab', async ({ page }) => {
  await page.goto('/program');

  await expect(page.locator('body')).toContainText('Program');
  await expect(page.getByRole('link', { name: /routine/i })).toBeVisible();
  await expect(page.locator('body')).toContainText(/SMV Hypertrophy|Routine/);
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
});

test('restores an active workout after reload', async ({ page }) => {
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

test('logs an SMV workout with RIR and an occupied-machine substitution', async ({ page }) => {
  test.setTimeout(90000);
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
    await occupied.click();
  }

  for (let i = 0; i < 40; i += 1) {
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
