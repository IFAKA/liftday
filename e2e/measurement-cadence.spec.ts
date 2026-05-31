import { expect, test, type Page } from '@playwright/test';
import { getMeasurementCheckDue } from '@/lib/measurement-schedule';
import type { DailyLog } from '@/lib/types';

const png1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64'
);

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

test('measurement cadence follows Monday weekly, biweekly, and monthly groups', () => {
  const emptyLogs: Record<string, DailyLog> = {};

  expect(getMeasurementCheckDue(new Date('2026-05-04T08:00:00'), emptyLogs)).toMatchObject({
    weightDue: true,
    photoDue: false,
    measurementFields: [{ key: 'waistCm', label: 'Waist' }],
  });

  expect(getMeasurementCheckDue(new Date('2026-05-11T08:00:00'), emptyLogs).measurementFields.map((field) => field.key))
    .toEqual(['waistCm', 'shoulderCm', 'chestCm', 'bicepsCm', 'forearmCm']);

  expect(getMeasurementCheckDue(new Date('2026-05-25T08:00:00'), emptyLogs).measurementFields.map((field) => field.key))
    .toEqual(['waistCm', 'shoulderCm', 'chestCm', 'bicepsCm', 'forearmCm', 'neckCm', 'hipCm', 'quadCm', 'calfCm']);
  expect(getMeasurementCheckDue(new Date('2026-05-25T08:00:00'), emptyLogs).photoDue).toBe(true);
});

test('missed Monday remains due until completed or skipped', () => {
  const tuesday = new Date('2026-05-12T08:00:00');

  expect(getMeasurementCheckDue(tuesday, {}).measurementFields.map((field) => field.key))
    .toContain('waistCm');

  expect(getMeasurementCheckDue(tuesday, {
    '2026-05-12': {
      dateKey: '2026-05-12',
      morningWeightKg: 68.2,
      waistCm: 77.1,
      shoulderCm: 112,
      chestCm: 91,
      bicepsCm: 29,
      forearmCm: 26,
    },
  })).toMatchObject({
    weightDue: false,
    photoDue: false,
    measurementFields: [],
  });

  expect(getMeasurementCheckDue(tuesday, {
    '2026-05-12': {
      dateKey: '2026-05-12',
      weightCheckSkippedDateKeys: ['2026-05-11'],
      measurementCheckSkippedDateKeys: ['2026-05-11'],
    },
  })).toMatchObject({
    weightDue: false,
    measurementFields: [],
  });
});

test('saturday is not a new scheduled check day', () => {
  const logs = {
    '2026-05-11': {
      dateKey: '2026-05-11',
      morningWeightKg: 68.2,
      waistCm: 77.1,
      shoulderCm: 112,
      chestCm: 91,
      bicepsCm: 29,
      forearmCm: 26,
    },
  };

  expect(getMeasurementCheckDue(new Date('2026-05-16T08:00:00'), logs)).toMatchObject({
    weightDue: false,
    photoDue: false,
    measurementFields: [],
  });
});

test('Monday workout gate only renders due fields and saves body fallbacks', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.clock.setFixedTime(new Date('2026-05-11T10:00:00'));
  await installRequiredNotificationStack(page);
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
    localStorage.removeItem('liftday_daily_logs');
    localStorage.removeItem('liftday_progress_photos');
    localStorage.removeItem('liftday_active_workout_draft');
    localStorage.removeItem('traindaily_sessions');
  });

  await page.goto('/');
  await page.getByRole('button', { name: /^start$/i }).click();

  await expect(page.locator('body')).toContainText('Measurements');
  await expect(page.getByRole('spinbutton', { name: /waist centimeters/i })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: /shoulder centimeters/i })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: /chest centimeters/i })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: /biceps centimeters/i })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: /forearm centimeters/i })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: /wrist centimeters/i })).toHaveCount(0);
  await expect(page.getByRole('spinbutton', { name: /ankle centimeters/i })).toHaveCount(0);

  await page.getByRole('spinbutton', { name: /waist centimeters/i }).fill('77.6');
  await page.getByRole('spinbutton', { name: /shoulder centimeters/i }).fill('113.7');
  await page.getByRole('spinbutton', { name: /chest centimeters/i }).fill('92.4');
  await page.getByRole('spinbutton', { name: /biceps centimeters/i }).fill('29.1');
  await page.getByRole('spinbutton', { name: /forearm centimeters/i }).fill('26.2');
  await page.getByRole('button', { name: /^save$/i }).click();

  await expect(page.locator('body')).toContainText('WEIGHT');
  await page.getByRole('spinbutton', { name: /bodyweight/i }).fill('68.4');
  await page.getByRole('button', { name: /save weight/i }).click();
  await expect(page.getByRole('button', { name: /^start timer$/i })).toBeVisible();

  await expect.poll(() => page.evaluate(() => {
    const logs = JSON.parse(localStorage.getItem('liftday_daily_logs') ?? '{}') as Record<string, DailyLog>;
    const profile = JSON.parse(localStorage.getItem('liftday_user_profile') ?? '{}') as { waistCircumferenceCm?: number };
    return { log: logs['2026-05-11'], waistFallback: profile.waistCircumferenceCm };
  })).toMatchObject({
    log: {
      dateKey: '2026-05-11',
      morningWeightKg: 68.4,
      waistCm: 77.6,
      shoulderCm: 113.7,
      chestCm: 92.4,
      bicepsCm: 29.1,
      forearmCm: 26.2,
    },
    waistFallback: 77.6,
  });
});

test('monthly photo check accepts an upload and displays it in body progress', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.clock.setFixedTime(new Date('2026-05-25T10:00:00'));
  await installRequiredNotificationStack(page);
  await page.addInitScript(() => {
    if (sessionStorage.getItem('monthly_photo_seeded')) return;
    sessionStorage.setItem('monthly_photo_seeded', 'true');
    localStorage.setItem('liftday_onboarding_completed', 'true');
    localStorage.setItem('liftday_daily_logs', JSON.stringify({
      '2026-05-25': {
        dateKey: '2026-05-25',
        morningWeightKg: 68.4,
        waistCm: 77.6,
        shoulderCm: 113.7,
        chestCm: 92.4,
        bicepsCm: 29.1,
        forearmCm: 26.2,
        neckCm: 37.5,
        hipCm: 86,
        quadCm: 50.5,
        calfCm: 35.5,
      },
    }));
    localStorage.removeItem('liftday_progress_photos');
    localStorage.removeItem('liftday_active_workout_draft');
    localStorage.removeItem('traindaily_sessions');
  });

  await page.goto('/');
  await page.getByRole('button', { name: /^start$/i }).click();
  await expect(page.locator('body')).toContainText('Photo');

  await page.locator('input[type="file"]').setInputFiles({
    name: 'progress.png',
    mimeType: 'image/png',
    buffer: png1x1,
  });
  await expect(page.getByAltText('Selected progress photo')).toBeVisible();
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page.getByRole('button', { name: /^start timer$/i })).toBeVisible();

  await page.goto('/history/body');
  await expect(page.locator('body')).toContainText('Photos');
  await expect(page.locator('body')).toContainText('2026-05-25');
  await expect(page.getByAltText('Latest progress photo')).toBeVisible();
});
