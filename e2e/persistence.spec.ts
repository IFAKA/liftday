import { writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const baseSession = {
  logged_at: '2026-05-11T10:00:00.000Z',
  week_number: 1,
  workout_type: 'push_a',
  cable_lateral_raise: [{ reps: 12, weight: 5, rir: 2 }],
};

const baseProfile = {
  activeRoutine: 'gym',
  tiers: {},
  tierProgress: {},
  createdAt: '2026-05-01T00:00:00.000Z',
  setsPerExercise: 3,
};

function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    app: 'liftday',
    schemaVersion: 2,
    exportedAt: '2026-05-11T10:15:00.000Z',
    source: 'phone',
    sessions: { '2026-05-11': baseSession },
    dailyLogs: {
      '2026-05-11': {
        dateKey: '2026-05-11',
        note: 'transactional import',
      },
    },
    profile: baseProfile,
    activeWorkoutDraft: null,
    firstSessionDate: '2026-05-11',
    mobilityDoneDate: null,
    onboardingCompleted: true,
    ...overrides,
  };
}

async function openImport(page: Page) {
  await page.goto('/sync');
  const direction = page.locator('details').filter({ hasText: 'Direction' });
  await direction.locator('summary').click();
  await direction.getByRole('button', { name: /^receive/i }).click();
  const details = page.locator('details');
  const count = await details.count();
  for (let index = 0; index < count; index += 1) {
    const detail = details.nth(index);
    if (!(await detail.evaluate((element) => (element as HTMLDetailsElement).open))) {
      await detail.locator(':scope > summary').click();
    }
  }
}

async function writeJsonFixture(testInfo: { outputPath: (path: string) => string }, name: string, value: unknown) {
  const path = testInfo.outputPath(name);
  await writeFile(path, JSON.stringify(value));
  return path;
}

test('corrupt JSON surfaces a storage issue and preserves the raw payload', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-05-11T10:00:00'));
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
    localStorage.setItem('traindaily_sessions', '{"2026-05-11":');
  });

  await page.goto('/');

  await expect(page.locator('body')).toContainText('Storage issue');
  await expect(page.locator('body')).toContainText('corrupt JSON');
  await expect.poll(() => page.evaluate(() => (
    Object.keys(localStorage).some((key) => key.startsWith('liftday_corrupt_payload_traindaily_sessions_'))
  ))).toBe(true);
});

test('invalid import payload writes nothing and shows an error', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
    localStorage.setItem('traindaily_sessions', JSON.stringify({ existing: { logged_at: 'keep' } }));
  });
  const badPath = await writeJsonFixture(testInfo, 'invalid-import.json', { app: 'not-liftday' });

  await openImport(page);
  await page.locator('input[type="file"]').setInputFiles(badPath);
  await page.getByRole('button', { name: /^import$/i }).click();

  await expect(page.locator('body')).toContainText('This is not a valid LiftDay sync file.');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('traindaily_sessions'))).toContain('existing');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('liftday_user_profile'))).toBeNull();
});

test('setItem failure during import rolls back earlier writes', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
    localStorage.setItem('traindaily_sessions', JSON.stringify({ existing: { logged_at: 'keep' } }));
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if (key === 'liftday_user_profile') {
        throw new Error('forced setItem failure');
      }
      return originalSetItem.call(this, key, value);
    };
  });
  const importPath = await writeJsonFixture(testInfo, 'setitem-failure-import.json', snapshot());

  await openImport(page);
  await page.locator('input[type="file"]').setInputFiles(importPath);
  await page.getByRole('button', { name: /^import$/i }).click();

  await expect(page.locator('body')).toContainText('Import aborted and rolled back');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('traindaily_sessions'))).toContain('existing');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('liftday_user_profile'))).toBeNull();
});

test('quota exceeded during import writes nothing', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
    localStorage.setItem('traindaily_sessions', JSON.stringify({ existing: { logged_at: 'keep' } }));
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if (key.startsWith('liftday_sync_backup_')) {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    };
  });
  const importPath = await writeJsonFixture(testInfo, 'quota-import.json', snapshot());

  await openImport(page);
  await page.locator('input[type="file"]').setInputFiles(importPath);
  await page.getByRole('button', { name: /^import$/i }).click();

  await expect(page.locator('body')).toContainText('Quota exceeded');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('traindaily_sessions'))).toContain('existing');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('liftday_daily_logs'))).toBeNull();
});

test('failed workout save does not show completion', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-05-11T10:00:00'));
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
    localStorage.setItem('liftday_active_workout_draft', JSON.stringify({
      version: 1,
      dateKey: '2026-05-11',
      state: 'exercising',
      exerciseIndex: 4,
      currentSet: 2,
      sessionReps: {
        cable_lateral_raise: [{ reps: 12, weight: 5, rir: 2 }],
        db_incline_press: [{ reps: 8, weight: 20, rir: 2 }],
        cable_fly: [{ reps: 10, weight: 10, rir: 2 }],
        overhead_tricep_ext: [{ reps: 10, weight: 10, rir: 2 }],
        cable_tricep_pushdown: [
          { reps: 10, weight: 10, rir: 2 },
          { reps: 10, weight: 10, rir: 2 },
        ],
      },
      startedAt: '2026-05-11T09:45:00.000Z',
      workoutType: 'push_a',
      savedAt: '2026-05-11T09:55:00.000Z',
      timer: 90,
      timerEndAt: null,
      timerPaused: false,
      nextExerciseName: '',
      unavailableEquipment: [],
      skippedChainIndices: [],
      requeuedExercises: [],
    }));
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if (key === 'traindaily_sessions') {
        throw new Error('forced workout save failure');
      }
      return originalSetItem.call(this, key, value);
    };
  });

  await page.goto('/');
  await expect(page.getByRole('button', { name: /log set/i })).toBeVisible();
  await page.getByRole('button', { name: /log set/i }).click();

  await expect(page.locator('body')).toContainText('Save failed');
  await expect(page.getByRole('button', { name: /retry save/i })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('SESSION COMPLETE');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('traindaily_sessions'))).toBeNull();
});
