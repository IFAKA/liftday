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

async function prepareTodayWorkout(page: Page, sessions: Record<string, unknown> | null) {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.clock.setFixedTime(new Date('2026-05-11T10:00:00'));
  await installRequiredNotificationStack(page);
  await page.addInitScript((initialSessions) => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
    localStorage.removeItem('liftday_active_workout_draft');
    if (initialSessions) {
      localStorage.setItem('traindaily_sessions', JSON.stringify(initialSessions));
    } else {
      localStorage.removeItem('traindaily_sessions');
    }
    localStorage.removeItem('traindaily_first_session');
  }, sessions);

  await page.goto('/');
  await startWarmupAndWorkout(page);
  await expect(page.getByRole('button', { name: /log set/i })).toBeVisible();
}

async function startWarmupAndWorkout(page: Page) {
  await page.getByRole('button', { name: /^start$/i }).click();
  await skipPreWorkoutGates(page);
  await expect(page.getByRole('button', { name: /^start timer$/i })).toBeVisible();
  await page.getByRole('button', { name: /^start timer$/i }).click();
  await expect(page.getByRole('button', { name: /^start workout$/i })).toBeVisible();
  await page.getByRole('button', { name: /^start workout$/i }).click();
}

async function skipPreWorkoutGates(page: Page) {
  const skip = page.getByRole('button', { name: /^skip$/i });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
  }
  const noScale = page.getByRole('button', { name: /^no scale$/i });
  if (await noScale.isVisible().catch(() => false)) {
    await noScale.click();
  }
}

async function logFirstSetAndSkipRest(page: Page, rir: number) {
  await page.getByRole('button', { name: `${rir} RIR` }).click();
  await page.getByRole('button', { name: /log set/i }).click();
  await expect(page.getByText(/resting/i)).toBeVisible();
  await page.getByRole('button', { name: /skip rest/i }).click();
  await expect(page.getByRole('button', { name: /log set/i })).toBeVisible();
}

async function logSetAndWaitForRest(page: Page, rir: number) {
  await page.getByRole('button', { name: `${rir} RIR` }).click();
  await page.getByRole('button', { name: /log set/i }).click();
  await expect(page.getByText(/resting/i)).toBeVisible();
}

test('opens the program screen', async ({ page }) => {
  await page.goto('/program');

  await expect(page.locator('body')).toContainText('Program');
  await expect(page.getByRole('link', { name: /^routine/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /muscles/i })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('Next days');
  await expect(page.getByRole('link', { name: /options/i })).toHaveCount(0);
  await expect(page.locator('body')).toContainText(/Hold course|Add|Deload|Routine/);
  await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
});

test('routine detail uses cable pull-through for the leg-day hinge slot', async ({ page }) => {
  await page.goto('/program/detail');

  await expect(page.locator('body')).toContainText('LEGS');
  const bodyText = await page.locator('body').innerText();
  const legExercises = [
    'HACK SQUAT',
    'CABLE PULL-THROUGH',
    'LEG PRESS',
    'LEG CURL',
    'LEG EXTENSION',
    'STANDING CALF RAISE',
  ];
  const indices = legExercises.map((name) => bodyText.indexOf(name));

  expect(indices.every((index) => index >= 0)).toBe(true);
  expect(indices).toEqual([...indices].sort((a, b) => a - b));
  expect(bodyText).not.toContain('ROMANIAN DEADLIFT');
});

test('today is the watch-style hub for app sections', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-05-11T10:00:00'));
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
  });

  await page.goto('/');

  await expect(page.getByRole('link', { name: /program/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /muscles/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /progress/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /options/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^start$/i })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('First: weight');
  await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
});

test('returning from program does not flash the home loader', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-05-11T10:00:00'));
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
    localStorage.removeItem('liftday_active_workout_draft');
  });

  await page.goto('/');
  await expect(page.getByRole('button', { name: /^start$/i })).toBeVisible();

  await page.evaluate(() => {
    const testWindow = window as typeof window & { __sawHomeLoaderAfterProgram?: boolean };
    testWindow.__sawHomeLoaderAfterProgram = false;
    const observer = new MutationObserver(() => {
      if (window.location.pathname === '/' && document.querySelector('svg.animate-pulse')) {
        testWindow.__sawHomeLoaderAfterProgram = true;
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
      subtree: true,
    });
  });

  await page.getByRole('link', { name: /program/i }).click();
  await expect(page.locator('body')).toContainText('Program');
  await page.getByLabel('Back').click();

  await expect(page.getByRole('button', { name: /^start$/i })).toBeVisible();
  await page.waitForTimeout(100);
  await expect.poll(() => page.evaluate(() => (
    window as typeof window & { __sawHomeLoaderAfterProgram?: boolean }
  ).__sawHomeLoaderAfterProgram)).toBe(false);
});

test('completed today mounts done state without flashing start state', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-05-11T10:00:00'));
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
    localStorage.setItem('traindaily_sessions', JSON.stringify({
      '2026-05-11': {
        logged_at: '2026-05-11T10:00:00.000Z',
        started_at: '2026-05-11T09:30:00.000Z',
        week_number: 1,
        workout_type: 'push_a',
      },
    }));
    (window as typeof window & { __sawStartBeforeDone?: boolean }).__sawStartBeforeDone = false;
    const interval = window.setInterval(() => {
      const text = document.body.innerText;
      if (/\bSTART\b/.test(text) && !/\bDONE\b/.test(text)) {
        (window as typeof window & { __sawStartBeforeDone?: boolean }).__sawStartBeforeDone = true;
        window.clearInterval(interval);
      }
    }, 0);
  });

  await page.goto('/');

  await expect(page.locator('body')).toContainText('DONE');
  await page.waitForTimeout(250);
  await expect.poll(() => page.evaluate(() => (window as typeof window & { __sawStartBeforeDone?: boolean }).__sawStartBeforeDone)).toBe(false);
  await expect(page.getByRole('button', { name: /^start$/i })).toHaveCount(0);
});

test('settings body row opens the canonical body screen', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
    localStorage.setItem('liftday_user_profile', JSON.stringify({
      createdAt: '2026-05-01T00:00:00.000Z',
      tiers: {},
      tierProgress: {},
      heightCm: 181,
      weightKg: 82.4,
      waistCircumferenceCm: 88.2,
    }));
  });

  await page.goto('/settings');

  const bodyRow = page.getByRole('button', { name: /body weight, measurements/i });
  await expect(bodyRow).toBeVisible();
  await expect(page.locator('body')).not.toContainText('82.4kg');

  await bodyRow.click();
  await expect(page).toHaveURL(/\/history\/body$/);
});

test('program avoids joint-risk-only deload when progression needs reps', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
    localStorage.setItem('traindaily_sessions', JSON.stringify({
      '2026-05-19': {
        logged_at: '2026-05-19T10:00:00.000Z',
        week_number: 1,
        workout_type: 'push_a',
        cable_lateral_raise: [
          { reps: 20, weight: 10, rir: 1 },
          { reps: 19, weight: 10, rir: 1 },
        ],
        db_incline_press: [
          { reps: 10, weight: 30, rir: 1 },
          { reps: 9, weight: 30, rir: 1 },
        ],
        lat_pulldown: [
          { reps: 12, weight: 40, rir: 1 },
          { reps: 11, weight: 40, rir: 1 },
        ],
      },
      '2026-05-25': {
        logged_at: '2026-05-25T10:00:00.000Z',
        week_number: 2,
        workout_type: 'push_a',
        cable_lateral_raise: [
          { reps: 12, weight: 10, rir: 1 },
          { reps: 11, weight: 10, rir: 1 },
        ],
        db_incline_press: [
          { reps: 6, weight: 30, rir: 1 },
          { reps: 5, weight: 30, rir: 1 },
        ],
        lat_pulldown: [
          { reps: 7, weight: 40, rir: 1 },
          { reps: 6, weight: 40, rir: 1 },
        ],
      },
    }));
    localStorage.setItem('liftday_daily_logs', JSON.stringify({
      '2026-05-26': {
        dateKey: '2026-05-26',
        sleepHours: 4,
        fatigue: 5,
        jointPain: true,
      },
    }));
  });

  await page.goto('/program');

  await expect(page.locator('body')).toContainText('Build Side delts Reps');
  await expect(page.locator('body')).toContainText('Repeat or reduce load.');
  await expect(page.locator('body')).toContainText('Load moved ahead of the 12-20 rep target; repeat or reduce load before adding volume.');
  await expect(page.locator('body')).toContainText('Build baseline');
  await expect(page.locator('body')).toContainText('Repeat the same slots until two full weeks are logged.');
  await expect(page.locator('body')).toContainText('Program score');
  await expect(page.locator('body')).toContainText('Load change');
  await expect(page.locator('body')).not.toContainText('Do now');
  await expect(page.locator('body')).not.toContainText('Watch');
  await expect(page.locator('body')).not.toContainText('Hold structure');
});

test('missed Monday start opens due measurements, gym weight check, then warm-up', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-05-16T10:00:00'));
  await installRequiredNotificationStack(page);
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
    localStorage.setItem('liftday_user_profile', JSON.stringify({
      createdAt: '2026-05-01T00:00:00.000Z',
      tiers: {},
      tierProgress: {},
      heightCm: 181,
      weightKg: 66.5,
      waistCircumferenceCm: 77.3,
      shoulderCircumferenceCm: 113.2,
      chestCircumferenceCm: 91.4,
      hipCircumferenceCm: 86.5,
      neckCircumferenceCm: 37.8,
      quadCircumferenceCm: 50,
      calfCircumferenceCm: 35,
      forearmCircumferenceCm: 25.5,
      wristCircumferenceCm: 16.5,
      ankleCircumferenceCm: 22.5,
      bicepsCircumferenceCm: 28,
      targetWeightKg: 72,
    }));
    if (!localStorage.getItem('liftday_daily_logs')) {
      localStorage.setItem('liftday_daily_logs', JSON.stringify({
        '2026-05-10': {
          dateKey: '2026-05-10',
          morningWeightKg: 66.7,
        },
      }));
    }
  });

  await page.goto('/');

  await expect(page.locator('body')).not.toContainText('First: weight');
  await expect(page.getByRole('button', { name: /^start$/i })).toBeVisible();

  await page.getByRole('button', { name: /^start$/i }).click();
  await expect(page.locator('body')).toContainText('Measurements');
  await expect(page.getByRole('spinbutton', { name: /waist centimeters/i })).toBeVisible();
  await page.getByRole('spinbutton', { name: /waist centimeters/i }).fill('77.6');
  await page.getByRole('spinbutton', { name: /shoulder centimeters/i }).fill('113.7');
  await page.getByRole('spinbutton', { name: /chest centimeters/i }).fill('92.4');
  await page.getByRole('spinbutton', { name: /biceps centimeters/i }).fill('29.1');
  await page.getByRole('spinbutton', { name: /forearm centimeters/i }).fill('26.2');
  await expect(page.getByRole('spinbutton', { name: /wrist centimeters/i })).toHaveCount(0);
  await expect(page.getByRole('spinbutton', { name: /ankle centimeters/i })).toHaveCount(0);
  await page.getByRole('button', { name: /^save$/i }).click();

  await expect(page.locator('body')).toContainText('WEIGHT');
  await expect(page.locator('body')).toContainText('Last 66.7kg');
  await expect(page.getByRole('spinbutton', { name: /bodyweight/i })).toBeVisible();

  await page.getByRole('spinbutton', { name: /bodyweight/i }).fill('66.8');
  await page.getByRole('button', { name: /save weight/i }).click();
  await expect(page.getByText(/warm up/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /^start timer$/i })).toBeVisible();

  await expect.poll(() => page.evaluate(() => {
    const logs = JSON.parse(localStorage.getItem('liftday_daily_logs') ?? '{}') as Record<string, { morningWeightKg?: number; weightCheckSkipped?: boolean; waistCm?: number; shoulderCm?: number; chestCm?: number; bicepsCm?: number; forearmCm?: number }>;
    return logs['2026-05-16'];
  })).toMatchObject({ dateKey: '2026-05-16', waistCm: 77.6, shoulderCm: 113.7, chestCm: 92.4, bicepsCm: 29.1, forearmCm: 26.2, morningWeightKg: 66.8, weightCheckSkipped: false });

  await page.goto('/history/body');
  await expect(page.locator('body')).toContainText('66.8kg');

  await page.goto('/');
  await expect(page.getByRole('button', { name: /^start timer$/i })).toBeVisible();
  await page.getByRole('button', { name: /^start timer$/i }).click();
  await expect(page.getByRole('button', { name: /^start workout$/i })).toBeVisible();
  await page.getByRole('button', { name: /^start workout$/i }).click();
  await expect(page.getByRole('button', { name: /log set/i })).toBeVisible();
});

test('saturday weight check can record no scale and continue to warm-up', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-05-16T10:00:00'));
  await installRequiredNotificationStack(page);
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
    localStorage.removeItem('liftday_daily_logs');
  });

  await page.goto('/');
  await page.getByRole('button', { name: /^start$/i }).click();
  await page.getByRole('button', { name: /^save$/i }).click();
  await page.getByRole('button', { name: /^no scale$/i }).click();

  await expect(page.getByText(/warm up/i)).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const logs = JSON.parse(localStorage.getItem('liftday_daily_logs') ?? '{}') as Record<string, { weightCheckSkipped?: boolean; waistCm?: number; shoulderCm?: number }>;
    return logs['2026-05-16'];
  })).toMatchObject({ dateKey: '2026-05-16', weightCheckSkipped: true, waistCm: 76.5, shoulderCm: 111.8 });
});

test('Monday start can skip due checks and open warm-up', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-05-11T10:00:00'));
  await installRequiredNotificationStack(page);
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
    localStorage.removeItem('liftday_daily_logs');
  });

  await page.goto('/');
  await page.getByRole('button', { name: /^start$/i }).click();
  await page.getByRole('button', { name: /^skip$/i }).click();
  await page.getByRole('button', { name: /^no scale$/i }).click();

  await expect(page.getByText(/warm up/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /^start timer$/i })).toBeVisible();
});

test('today start opens warm-up before the first exercise', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.clock.install({ time: new Date('2026-05-11T10:00:00') });
  await installRequiredNotificationStack(page);
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
    localStorage.removeItem('liftday_active_workout_draft');
    localStorage.removeItem('traindaily_sessions');
    localStorage.removeItem('traindaily_first_session');
  });

  await page.goto('/');
  await page.getByRole('button', { name: /^start$/i }).click();
  await skipPreWorkoutGates(page);

  await expect(page.getByText(/warm up/i)).toBeVisible();
  await expect(page.getByText('01:00')).toBeVisible();
  await expect(page.getByRole('button', { name: /^start timer$/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^start workout$/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /log set/i })).toHaveCount(0);

  await page.getByRole('button', { name: /^30s$/i }).click();
  await expect(page.getByText('00:30')).toBeVisible();

  await page.getByRole('button', { name: /^start timer$/i }).click();
  await expect(page.getByRole('button', { name: /^start workout$/i })).toBeVisible();
  await page.clock.fastForward(30000);
  await expect(page.getByText(/ready/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /^repeat 30s$/i })).toBeVisible();
  await page.getByRole('button', { name: /^repeat 30s$/i }).click();
  await expect(page.getByText('00:30')).toBeVisible();
  await page.clock.fastForward(30000);
  await expect(page.getByText(/ready/i)).toBeVisible();
  await page.getByRole('button', { name: /^start workout$/i }).click();
  await expect(page.getByRole('button', { name: /log set/i })).toBeVisible();
});

test('today start is not blocked by pending notification permission', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-05-11T10:00:00'));
  await page.addInitScript(() => {
    class PendingNotification {
      static permission: NotificationPermission = 'default';
      static requestPermission = async () => new Promise<NotificationPermission>(() => {});
    }

    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: PendingNotification,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: new Promise(() => {}),
      },
    });
    localStorage.setItem('liftday_onboarding_completed', 'true');
    localStorage.removeItem('liftday_active_workout_draft');
    localStorage.removeItem('traindaily_sessions');
    localStorage.removeItem('traindaily_first_session');
  });

  await page.goto('/');
  await page.getByRole('button', { name: /^start$/i }).click();
  await skipPreWorkoutGates(page);
  await expect(page.getByText(/warm up/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /^start timer$/i })).toBeVisible();
});

test('rest timer next exercise name copies to clipboard', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await prepareTodayWorkout(page, null);

  for (let setIndex = 0; setIndex < 4; setIndex += 1) {
    await logSetAndWaitForRest(page, 2);
    await page.getByRole('button', { name: /skip rest/i }).click();
    await expect(page.getByRole('button', { name: /log set/i })).toBeVisible();
  }

  await logSetAndWaitForRest(page, 2);
  const nextExerciseName = 'INCLINE DUMBBELL PRESS';
  await expect(page.getByRole('button', { name: `Copy ${nextExerciseName}` })).toBeVisible();
  await page.getByRole('button', { name: `Copy ${nextExerciseName}` }).click();

  await expect(page.locator('body')).toContainText('Copied');
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(nextExerciseName);
});

test('warm-up cancel returns to Today without logging the workout', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.clock.setFixedTime(new Date('2026-05-11T10:00:00'));
  await installRequiredNotificationStack(page);
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
    localStorage.removeItem('liftday_active_workout_draft');
    localStorage.removeItem('traindaily_sessions');
  });

  await page.goto('/');
  await page.getByRole('button', { name: /^start$/i }).click();
  await skipPreWorkoutGates(page);
  await page.getByRole('button', { name: /cancel warm-up/i }).click();

  await expect(page.getByRole('button', { name: /^start$/i })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('DONE');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('traindaily_sessions'))).toBeNull();
});

test('rest-day today exposes supporting drill-down rows without measurement prompts', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-05-10T10:00:00'));
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
  });

  await page.goto('/');

  await expect(page.locator('body')).toContainText('REST');
  await expect(page.locator('body')).not.toContainText('Waist + shoulders');
  await expect(page.locator('body')).not.toContainText('Same conditions');
  await expect(page.getByRole('spinbutton', { name: /waist circumference/i })).toHaveCount(0);
  await expect(page.getByRole('spinbutton', { name: /shoulder circumference/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /program/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /muscles/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /progress/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /options/i })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /mobility/i })).toBeVisible();

  await page.goto('/program');
  await page.goto('/');
  await expect(page.locator('body')).toContainText('REST');
  await expect(page.locator('body')).not.toContainText('Waist + shoulders');
  await expect(page.locator('body')).not.toContainText('Same conditions');
  await expect(page.getByRole('spinbutton', { name: /waist circumference/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /program/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /mobility/i })).toBeVisible();
});

test('muscle map switches filters and body views', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.clock.setFixedTime(new Date('2026-05-11T10:00:00'));
  await page.addInitScript(() => {
    localStorage.setItem('traindaily_sessions', JSON.stringify({
      '2026-05-11': {
        logged_at: '2026-05-11T10:00:00.000Z',
        week_number: 2,
        workout_type: 'push_a',
        cable_lateral_raise: [
          { reps: 16, weight: 8, rir: 1 },
          { reps: 15, weight: 8, rir: 1 },
        ],
        db_incline_press: [
          { reps: 9, weight: 20, rir: 2 },
          { reps: 8, weight: 20, rir: 2 },
        ],
      },
    }));
  });

  await page.goto('/muscles');

  await expect(page.locator('body')).toContainText('Muscles');
  await expect(page.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('body')).toContainText('PUSH A');
  await expect(page.locator('body')).toContainText('hit / plan');
  await expect(page.locator('.body-chart-muscle')).not.toHaveCount(0);

  await page.getByRole('button', { name: 'Routine' }).click();
  await expect(page.getByRole('button', { name: 'Routine' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('body')).toContainText('Gym Hypertrophy');

  await page.getByRole('button', { name: '7 days' }).click();
  await expect(page.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('body')).toContainText('Logged work');
  await page.getByRole('button', { name: /^copy muscle report$/i }).click();
  await expect(page.getByRole('button', { name: /^copied report$/i })).toBeVisible();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('LiftDay muscle report');
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('Lens: 7 days');

  const firstSelected = page.locator('section', { hasText: 'Selected' });
  await expect(firstSelected).toContainText(/Side delts|Chest|Lats|Rear delts|Biceps|Triceps/i);
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('button', { name: 'Back' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.body-chart-muscle').first()).toBeVisible();

  await page.locator('.body-chart-muscle').first().click({ force: true });
  await expect(page.locator('section', { hasText: 'Selected' })).toContainText(/Eff sets|Target|Heat/);
});

test('progress opens as summary and drill-down rows, not a tab section', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('traindaily_sessions', JSON.stringify({
      '2026-05-04': {
        logged_at: '2026-05-04T10:00:00.000Z',
        week_number: 1,
        workout_type: 'push_a',
        cable_lateral_raise: [{ reps: 10, weight: 10, rir: 2 }],
        db_incline_press: [{ reps: 10, weight: 10, rir: 2 }],
        lat_pulldown: [{ reps: 10, weight: 10, rir: 2 }],
        hack_squat: [{ reps: 10, weight: 10, rir: 2 }],
        romanian_deadlift: [{ reps: 10, weight: 10, rir: 2 }],
        leg_press: [{ reps: 10, weight: 10, rir: 2 }],
        leg_curl_machine: [{ reps: 10, weight: 10, rir: 2 }],
      },
      '2026-05-11': {
        logged_at: '2026-05-11T10:00:00.000Z',
        week_number: 2,
        workout_type: 'push_a',
        cable_lateral_raise: [{ reps: 20, weight: 10, rir: 2 }],
        db_incline_press: [{ reps: 20, weight: 10, rir: 2 }],
        lat_pulldown: [{ reps: 20, weight: 10, rir: 2 }],
        hack_squat: [{ reps: 10, weight: 10, rir: 2 }],
        romanian_deadlift: [{ reps: 10, weight: 10, rir: 2 }],
        leg_press: [{ reps: 10, weight: 10, rir: 2 }],
        leg_curl_machine: [{ reps: 10, weight: 10, rir: 2 }],
      },
      '2026-05-18': {
        logged_at: '2026-05-18T10:00:00.000Z',
        week_number: 3,
        workout_type: 'push_a',
        cable_lateral_raise: [{ reps: 18, weight: 10, rir: 2 }],
        db_incline_press: [{ reps: 18, weight: 10, rir: 2 }],
        lat_pulldown: [{ reps: 18, weight: 10, rir: 2 }],
        hack_squat: [{ reps: 30, weight: 10, rir: 2 }],
        romanian_deadlift: [{ reps: 30, weight: 10, rir: 2 }],
        leg_press: [{ reps: 30, weight: 10, rir: 2 }],
        leg_curl_machine: [{ reps: 30, weight: 10, rir: 2 }],
      },
    }));
  });

  await page.goto('/history');

  await expect(page.locator('body')).toContainText('Progress');
  await expect(page.locator('body')).toContainText('Command');
  await expect(page.locator('body')).toContainText('Score up, lifts down');
  await expect(page.locator('body')).toContainText('Your weekly score rose, but recent priority lifts dropped.');
  await expect(page.locator('body')).toContainText('Hold routine. Keep jumps small and improve recovery.');
  await expect(page.locator('body')).toContainText('Pace');
  await expect(page.locator('body')).not.toContainText('Ahead of plan');
  await expect(page.locator('body')).toContainText('Progress score');
  await expect(page.locator('body')).toContainText('This week');
  await expect(page.locator('body')).toContainText('Plan');
  await expect(page.locator('body')).toContainText('Attention');
  await expect(page.getByRole('button', { name: /muscles/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /detail/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /best sets/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /sessions/i })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);

  await page.getByRole('button', { name: /body/i }).click();
  await expect(page).toHaveURL(/\/history\/body$/);
  await expect(page.locator('body')).toContainText('Body progress');
  await expect(page.locator('body')).toContainText('Current');
  await expect(page.locator('body')).toContainText('Weight');
  await expect(page.locator('body')).toContainText('68.6kg');
  await expect(page.locator('body')).toContainText('Waist');
  await expect(page.locator('body')).toContainText('76.5cm');
  await expect(page.locator('body')).toContainText('Ratio progress');
  await expect(page.locator('body')).toContainText('Ratio targets');
  await expect(page.locator('body')).toContainText('Shoulder/waist');
  await expect(page.locator('body')).toContainText('Chest / waist');
  await expect(page.locator('body')).toContainText('Waist / height');
  await expect(page.locator('body')).toContainText('Biceps / wrist');
  await expect(page.locator('body')).toContainText('To target');
  await expect(page.locator('body')).toContainText('Change');
  await expect(page.locator('body')).not.toContainText('Measurements');
  await expect(page.getByRole('img', { name: /body ratio progress chart/i })).toBeVisible();
  await expect(page.locator('body')).toContainText('Height');
  await expect(page.locator('body')).toContainText('Shoulder');
  await expect(page.locator('body')).toContainText('Chest');
  await expect(page.locator('body')).toContainText('Hip');
  await expect(page.locator('body')).toContainText('85cm');
  await page.locator('a[href="/history/body/weight"]').click();
  await expect(page).toHaveURL(/\/history\/body\/weight$/);
  await expect(page.locator('body')).toContainText('Weight progress');
  await expect(page.locator('body')).toContainText('Latest');
  await expect(page.locator('body')).toContainText('Weekly chart');
});

test('body detail shows shoulder-waist progress over time', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('liftday_user_profile', JSON.stringify({
      createdAt: '2026-05-01T00:00:00.000Z',
      tiers: {},
      tierProgress: {},
      heightCm: 172,
      weightKg: 68.6,
      shoulderCircumferenceCm: 111.5,
      waistCircumferenceCm: 76.8,
    }));
    localStorage.setItem('liftday_daily_logs', JSON.stringify({
      '2026-05-04': {
        dateKey: '2026-05-04',
        morningWeightKg: 68.6,
        waistCm: 76.5,
        shoulderCm: 111.8,
      },
      '2026-05-11': {
        dateKey: '2026-05-11',
        morningWeightKg: 69.1,
        shoulderCm: 112.4,
      },
      '2026-05-17': {
        dateKey: '2026-05-17',
        waistCm: 76.1,
        shoulderCm: 112.9,
      },
    }));
  });

  await page.goto('/history/body');

  await expect(page.locator('body')).toContainText('Ratio progress');
  await expect(page.locator('body')).toContainText('May 4');
  await expect(page.locator('body')).toContainText('May 11');
  await expect(page.locator('body')).toContainText('May 17');
  await expect(page.locator('body')).toContainText('69.1kg');
  await expect(page.locator('body')).toContainText('76.1cm');
  await expect(page.locator('body')).toContainText('112.9cm');
  await expect(page.locator('body')).toContainText('Shoulder/waist');
  await expect(page.locator('body')).toContainText('Ratio targets');
  await expect(page.locator('body')).toContainText('Chest / waist');
  await expect(page.locator('body')).toContainText('Waist / height');
  await expect(page.locator('body')).toContainText('+0.14');
  await expect(page.locator('body')).toContainText('+0.03');
  await expect(page.getByRole('img', { name: /body ratio progress chart/i })).toBeVisible();
});

test('body measurement detail shows weekly progress without filling sparse weeks', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('liftday_user_profile', JSON.stringify({
      createdAt: '2026-05-01T00:00:00.000Z',
      tiers: {},
      tierProgress: {},
      heightCm: 172,
      weightKg: 68.6,
      shoulderCircumferenceCm: 111.5,
      waistCircumferenceCm: 76.8,
    }));
    localStorage.setItem('liftday_daily_logs', JSON.stringify({
      '2026-05-04': {
        dateKey: '2026-05-04',
        morningWeightKg: 68.6,
        waistCm: 76.5,
        shoulderCm: 111.8,
      },
      '2026-05-18': {
        dateKey: '2026-05-18',
        morningWeightKg: 69.1,
        waistCm: 76.1,
        shoulderCm: 112.9,
      },
    }));
  });

  await page.goto('/history/body/shoulder');

  await expect(page.locator('body')).toContainText('Shoulder progress');
  await expect(page.locator('body')).toContainText('112.9cm');
  await expect(page.locator('body')).toContainText('+1.4cm');
  await expect(page.locator('body')).toContainText('+1.1cm');
  await expect(page.locator('body')).toContainText('Week May 4');
  await expect(page.locator('body')).toContainText('Week May 18');
  await expect(page.locator('body')).not.toContainText('Week May 11');
  await expect(page.getByRole('img', { name: /shoulder weekly progress chart/i })).toBeVisible();
});

test('invalid body measurement detail shows not found', async ({ page }) => {
  await page.goto('/history/body/not-real');

  await expect(page.locator('body')).toContainText('Not Found');
  await expect(page.locator('body')).toContainText('That measurement is not tracked.');
  await page.locator('button').filter({ hasText: /^Back$/ }).click();
  await expect(page).toHaveURL(/\/history\/body$/);
});

test('body detail uses profile waist as sparse history baseline', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('liftday_user_profile', JSON.stringify({
      createdAt: '2026-05-01T00:00:00.000Z',
      tiers: {},
      tierProgress: {},
      heightCm: 172,
      weightKg: 68.7,
      shoulderCircumferenceCm: 111.8,
      waistCircumferenceCm: 76.5,
    }));
    localStorage.setItem('liftday_daily_logs', JSON.stringify({
      '2026-05-18': {
        dateKey: '2026-05-18',
        morningWeightKg: 68.5,
      },
      '2026-05-19': {
        dateKey: '2026-05-19',
        morningWeightKg: 68.7,
        waistCm: 76.5,
      },
    }));
  });

  await page.goto('/history/body');

  await expect(page.locator('body')).toContainText('Ratio progress');
  await expect(page.locator('body')).toContainText('3 logs');
  await expect(page.locator('body')).toContainText('0.00');
  await expect(page.locator('body')).toContainText('May 1');
  await expect(page.locator('body')).toContainText('May 18');
  await expect(page.locator('body')).toContainText('111.8cm');
  await expect(page.locator('body')).toContainText('76.5cm');
  const ratioPath = await page.locator('svg[aria-label="Body ratio progress chart"] path').first().getAttribute('d');
  const yValues = (ratioPath?.match(/-?\d+(?:\.\d+)?/g) ?? [])
    .map(Number)
    .filter((_, index) => index % 2 === 1);
  expect(Math.max(...yValues) - Math.min(...yValues)).toBeLessThan(20);
});

test('body detail uses profile fallback when logs are empty', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('liftday_daily_logs');
    localStorage.setItem('liftday_user_profile', JSON.stringify({
      createdAt: '2026-05-01T00:00:00.000Z',
      tiers: {},
      tierProgress: {},
      heightCm: 181,
      weightKg: 82.4,
      waistCircumferenceCm: 88.2,
    }));
  });

  await page.goto('/history/body');

  await expect(page.locator('body')).toContainText('82.4kg');
  await expect(page.locator('body')).toContainText('88.2cm');
  await expect(page.locator('body')).toContainText('May 1');
  await expect(page.locator('body')).toContainText('Current');
  await expect(page.locator('body')).not.toContainText('68.6kg');
});

test('body detail editor saves today body logs and profile height fallback', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-05-11T10:00:00'));
  await page.addInitScript(() => {
    localStorage.removeItem('liftday_daily_logs');
    localStorage.setItem('liftday_user_profile', JSON.stringify({
      createdAt: '2026-05-01T00:00:00.000Z',
      tiers: {},
      tierProgress: {},
      heightCm: 172,
      weightKg: 68.6,
      shoulderCircumferenceCm: 112,
      waistCircumferenceCm: 76.5,
      chestCircumferenceCm: 90,
      hipCircumferenceCm: 85,
      neckCircumferenceCm: 37,
      quadCircumferenceCm: 50,
      calfCircumferenceCm: 35,
      forearmCircumferenceCm: 25.5,
      wristCircumferenceCm: 16.5,
      ankleCircumferenceCm: 22.5,
      bicepsCircumferenceCm: 28,
      targetWeightKg: 72,
    }));
  });

  await page.goto('/history/body');

  await page.getByRole('button', { name: /update/i }).click();
  await page.getByRole('spinbutton', { name: /^weight kg$/i }).fill('70.2');
  await page.getByRole('spinbutton', { name: /waist cm/i }).fill('77.3');
  await page.getByRole('spinbutton', { name: /shoulder cm/i }).fill('113.2');
  await page.getByRole('spinbutton', { name: /chest cm/i }).fill('91.4');
  await page.getByRole('spinbutton', { name: /hip cm/i }).fill('86.5');
  await page.getByRole('spinbutton', { name: /neck cm/i }).fill('37.8');
  await page.getByRole('spinbutton', { name: /quad cm/i }).fill('50');
  await page.getByRole('spinbutton', { name: /calf cm/i }).fill('35');
  await page.getByRole('spinbutton', { name: /forearm cm/i }).fill('25.5');
  await page.getByRole('spinbutton', { name: /wrist cm/i }).fill('16.7');
  await page.getByRole('spinbutton', { name: /ankle cm/i }).fill('22.8');
  await page.getByRole('spinbutton', { name: /biceps cm/i }).fill('28');
  await page.getByRole('spinbutton', { name: /ideal weight kg/i }).fill('72');
  await page.getByRole('spinbutton', { name: /height cm/i }).fill('180');
  await page.getByRole('button', { name: /^save$/i }).click();

  await expect(page.locator('body')).toContainText('70.2kg');
  await expect(page.locator('body')).toContainText('77.3cm');
  await expect(page.locator('body')).toContainText('180cm');
  await expect(page.locator('body')).toContainText('113.2cm');
  await expect(page.locator('body')).toContainText('91.4cm');
  await expect(page.locator('body')).toContainText('86.5cm');
  await expect(page.locator('body')).toContainText('37.8cm');
  await expect(page.locator('body')).toContainText('50cm');
  await expect(page.locator('body')).toContainText('35cm');
  await expect(page.locator('body')).toContainText('25.5cm');
  await expect(page.locator('body')).toContainText('16.7cm');
  await expect(page.locator('body')).toContainText('22.8cm');
  await expect(page.locator('body')).toContainText('28cm');
  await expect(page.locator('body')).toContainText('72kg');
  await expect(page.locator('body')).toContainText('1.46');
  await expect.poll(() => page.evaluate(() => {
    const logs = JSON.parse(localStorage.getItem('liftday_daily_logs') ?? '{}') as Record<string, { morningWeightKg?: number; heightCm?: number; waistCm?: number; shoulderCm?: number; chestCm?: number; hipCm?: number; neckCm?: number; quadCm?: number; calfCm?: number; forearmCm?: number; wristCm?: number; ankleCm?: number; bicepsCm?: number }>;
    return logs['2026-05-11'];
  })).toEqual({ dateKey: '2026-05-11', morningWeightKg: 70.2, heightCm: 180, waistCm: 77.3, shoulderCm: 113.2, chestCm: 91.4, hipCm: 86.5, neckCm: 37.8, quadCm: 50, calfCm: 35, forearmCm: 25.5, wristCm: 16.7, ankleCm: 22.8, bicepsCm: 28 });
  await expect.poll(() => page.evaluate(() => {
    const profile = JSON.parse(localStorage.getItem('liftday_user_profile') ?? '{}') as { heightCm?: number; weightKg?: number; waistCircumferenceCm?: number; shoulderCircumferenceCm?: number; chestCircumferenceCm?: number; hipCircumferenceCm?: number; neckCircumferenceCm?: number; quadCircumferenceCm?: number; calfCircumferenceCm?: number; forearmCircumferenceCm?: number; wristCircumferenceCm?: number; ankleCircumferenceCm?: number; bicepsCircumferenceCm?: number; targetWeightKg?: number };
    return {
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      waistCircumferenceCm: profile.waistCircumferenceCm,
      shoulderCircumferenceCm: profile.shoulderCircumferenceCm,
      chestCircumferenceCm: profile.chestCircumferenceCm,
      hipCircumferenceCm: profile.hipCircumferenceCm,
      neckCircumferenceCm: profile.neckCircumferenceCm,
      quadCircumferenceCm: profile.quadCircumferenceCm,
      calfCircumferenceCm: profile.calfCircumferenceCm,
      forearmCircumferenceCm: profile.forearmCircumferenceCm,
      wristCircumferenceCm: profile.wristCircumferenceCm,
      ankleCircumferenceCm: profile.ankleCircumferenceCm,
      bicepsCircumferenceCm: profile.bicepsCircumferenceCm,
      targetWeightKg: profile.targetWeightKg,
    };
  })).toEqual({ heightCm: 180, weightKg: 70.2, waistCircumferenceCm: 77.3, shoulderCircumferenceCm: 113.2, chestCircumferenceCm: 91.4, hipCircumferenceCm: 86.5, neckCircumferenceCm: 37.8, quadCircumferenceCm: 50, calfCircumferenceCm: 35, forearmCircumferenceCm: 25.5, wristCircumferenceCm: 16.7, ankleCircumferenceCm: 22.8, bicepsCircumferenceCm: 28, targetWeightKg: 72 });
});

test('exercise detail copies the exercise name instead of opening a tutorial', async ({ page }) => {
  await page.goto('/program/detail');
  await page.getByRole('link', { name: /incline|pull|squat|curl|raise/i }).first().click();

  await expect(page).toHaveURL(/\/exercises\//);
  await expect(page.getByRole('button', { name: /^copy exercise name$/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /open tutorial/i })).toHaveCount(0);

  await page.getByRole('button', { name: /^copy exercise name$/i }).click();
  await expect(page).toHaveURL(/\/exercises\//);
  await expect(page.getByRole('button', { name: /copy exercise name|copied/i })).toBeVisible();
});

test('shows adaptive progress detail metrics', async ({ page }) => {
  await page.goto('/history/detail');

  await expect(page.locator('body')).toContainText('Progress Detail');
  await expect(page.getByRole('button', { name: /copy progress/i })).toBeVisible();
  await expect(page.locator('body')).toContainText('Pace');
  await expect(page.locator('body')).toContainText(/Behind this week|On track|Ahead of plan|Need logs/);
  await expect(page.locator('body')).toContainText('Progress score');
  await expect(page.locator('body')).toContainText('This week');
  await expect(page.locator('body')).toContainText('Plan');
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
  await skipPreWorkoutGates(page);
  await expect(page.getByRole('button', { name: /^start timer$/i })).toBeVisible();
  await page.reload();
  await expect(page.getByText(/warm up/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /^start timer$/i })).toBeVisible();
  await page.getByRole('button', { name: /^start timer$/i }).click();
  await expect(page.getByRole('button', { name: /^start workout$/i })).toBeVisible();
  await page.getByRole('button', { name: /^start workout$/i }).click();
  await expect(page.getByRole('button', { name: /log set/i })).toBeVisible();
  await expect(page.getByRole('button', { name: '2 RIR' })).toBeVisible();

  await page.getByRole('button', { name: /log set/i }).click();
  await expect(page.getByText(/resting/i)).toBeVisible();

  await page.reload();
  await expect(page.getByText(/resting/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /undo last set/i })).toBeVisible();
});

test('shows set 1 coaching reference from the previous workout', async ({ page }) => {
  await prepareTodayWorkout(page, {
    '2026-05-04': {
      logged_at: '2026-05-04T10:00:00.000Z',
      week_number: 1,
      workout_type: 'push_a',
      cable_lateral_raise: [
        { reps: 20, weight: 10, rir: 2 },
        { reps: 20, weight: 10, rir: 2 },
        { reps: 20, weight: 10, rir: 2 },
      ],
    },
  });

  const previousRow = page.getByText(/^Last: 10kg x 20 @2$/);
  const logSet = page.getByRole('button', { name: /log set/i });
  await expect(previousRow).toBeVisible();
  await expect(logSet).toBeVisible();
  await expect(page.getByText('Keep', { exact: true })).toBeVisible();

  const previousBox = await previousRow.boundingBox();
  const logBox = await logSet.boundingBox();
  expect(previousBox).not.toBeNull();
  expect(logBox).not.toBeNull();
  expect(previousBox!.y + previousBox!.height).toBeLessThan(logBox!.y);

  await page.getByRole('button', { name: '4 RIR' }).click();
  await expect(page.getByText(/top reps were easy/i)).toBeVisible();
});

test('shows no coaching reference on set 1 without prior workout data', async ({ page }) => {
  await prepareTodayWorkout(page, null);

  await expect(page.getByText(/^No prior set$/)).toBeVisible();
});

test('auto-fills adjusted next set while allowing manual edits', async ({ page }) => {
  await prepareTodayWorkout(page, null);

  await page.getByRole('button', { name: '4 RIR' }).click();
  await page.getByRole('button', { name: /log set/i }).click();
  await expect(page.getByText(/resting/i)).toBeVisible();
  await page.getByRole('button', { name: /skip rest/i }).click();
  await expect(page.getByRole('button', { name: /log set/i })).toBeVisible();

  await expect(page.getByText('Add reps')).toBeVisible();
  await expect(page.locator('body')).toContainText(/14\s*REPS/);
  await expect(page.getByText(/nudge reps while staying in the rep range/i)).toBeVisible();

  await page.getByRole('button', { name: 'Decrease' }).nth(1).click();
  await expect(page.locator('body')).toContainText(/13\s*REPS/);
  await expect(page.getByText(/changed the target/i)).toBeVisible();
});

test('set 2 coaching reference uses today set 1 when prior workout only has set 1', async ({ page }) => {
  await prepareTodayWorkout(page, {
    '2026-05-04': {
      logged_at: '2026-05-04T10:00:00.000Z',
      week_number: 1,
      workout_type: 'push_a',
      cable_lateral_raise: [
        { reps: 20, weight: 10, rir: 2 },
      ],
    },
  });

  await logFirstSetAndSkipRest(page, 4);

  await expect(page.getByText(/^Last: 10kg x 20 @4$/)).toBeVisible();
});

test('set 2 coaching reference prefers today set 1 over prior workout set 2', async ({ page }) => {
  await prepareTodayWorkout(page, {
    '2026-05-04': {
      logged_at: '2026-05-04T10:00:00.000Z',
      week_number: 1,
      workout_type: 'push_a',
      cable_lateral_raise: [
        { reps: 20, weight: 10, rir: 2 },
        { reps: 12, weight: 12.5, rir: 2 },
      ],
    },
  });

  await logFirstSetAndSkipRest(page, 4);

  await expect(page.getByText(/^Last: 10kg x 20 @4$/)).toBeVisible();
  await expect(page.getByText(/^Last: 12.5kg x 12 @2$/)).toHaveCount(0);
});

test('logs an SMV workout with RIR and occupied-machine deferral', async ({ page }) => {
  test.setTimeout(120000);
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
  await startWarmupAndWorkout(page);
  await expect(page.getByRole('button', { name: /log set/i })).toBeVisible();

  const occupied = page.getByRole('button', { name: /machine occupied/i });
  if (await occupied.isVisible()) {
    const currentExerciseName = await page.locator('[aria-label^="Copy "]').first().innerText();
    await occupied.click();
    const picker = page.getByRole('dialog', { name: /choose swap/i });
    await expect(picker).toBeHidden();
    await expect.poll(async () => page.locator('[aria-label^="Copy "]').first().innerText()).not.toBe(currentExerciseName);
  }

  for (let i = 0; i < 80; i += 1) {
    if (await page.getByText(/^stretch$/i).isVisible().catch(() => false)) break;
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

  await expect(page.getByText(/stretch/i)).toBeVisible();
  await expect(page.getByText('00:30')).toBeVisible();
  await expect(page.getByRole('button', { name: /^start timer$/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /^done$/i })).toHaveCount(0);

  await page.getByRole('button', { name: /^start timer$/i }).click();
  await expect(page.getByRole('button', { name: /^stretching$/i })).toBeDisabled();
  await page.waitForTimeout(31000);
  await expect(page.getByText(/ready/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /^repeat 30s$/i })).toBeVisible();
  await page.getByRole('button', { name: /^done$/i }).click();

  await expect(page.locator('body')).toContainText(/session complete/i);
  await page.goto('/history');
  await expect(page.locator('body')).toContainText(/Progress|Session/i);
});
