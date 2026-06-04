import { readFile, writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import {
  decodePairingPayload,
  encodePairingPayload,
  WEBRTC_ANSWER_TYPE,
  WEBRTC_OFFER_TYPE,
} from '@/lib/sync-webrtc';

const seededSession = {
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
};

const seededProfile = {
  activeRoutine: 'gym',
  tiers: { gym_push_a_lateral_raise: 2 },
  tierProgress: {
    gym_push_a_lateral_raise: {
      slotId: 'gym_push_a_lateral_raise',
      consecutiveMaxSessions: 1,
      consecutiveMinSessions: 0,
    },
  },
  createdAt: '2026-05-01T08:00:00.000Z',
  setsPerExercise: 3,
  heightCm: 172,
  weightKg: 77,
  age: 26,
  sex: 'male',
  bodyComposition: 'skinny_fat',
  trainingBackground: 'E2E backup fixture',
  gymAccess: true,
  injuryStatus: 'No injuries or pain',
  maxWorkoutMinutes: 90,
  goal: 'Restore local training state',
  targetDate: '2026-12-31',
  proteinTargetGrams: [150, 180],
  calorieSurplusTarget: [200, 300],
};

const seededDraft = {
  version: 1,
  dateKey: '2026-05-11',
  state: 'exercising',
  exerciseIndex: 0,
  currentSet: 1,
  sessionReps: {
    cable_lateral_raise: [{ reps: 14, weight: 8, rir: 2 }],
  },
  startedAt: '2026-05-11T09:55:00.000Z',
  workoutType: 'push_a',
  savedAt: '2026-05-11T10:05:00.000Z',
  timer: 90,
  timerEndAt: null,
  timerPaused: false,
  nextExerciseName: '',
  unavailableEquipment: [],
  skippedChainIndices: [],
  requeuedExercises: [],
};

async function seedFullLocalState(page: Page) {
  await page.addInitScript(({ session, profile, draft }) => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
    localStorage.setItem('traindaily_sessions', JSON.stringify({ '2026-05-11': session }));
    localStorage.setItem('liftday_user_profile', JSON.stringify(profile));
    localStorage.setItem('liftday_daily_logs', JSON.stringify({
      '2026-05-11': {
        dateKey: '2026-05-11',
        morningWeightKg: 77.2,
        sleepHours: 7.5,
        fatigue: 2,
        note: 'Backup fixture',
      },
    }));
    localStorage.setItem('liftday_progress_photos', JSON.stringify([{
      id: 'photo-2026-05-11',
      dateKey: '2026-05-11',
      createdAt: '2026-05-11T08:00:00.000Z',
      pose: 'front',
      imageData: 'data:image/webp;base64,AAAA',
    }]));
    localStorage.setItem('liftday_active_workout_draft', JSON.stringify(draft));
    localStorage.setItem('traindaily_first_session', '2026-05-01');
    localStorage.setItem('traindaily_mobility_done', '2026-05-10');
  }, { session: seededSession, profile: seededProfile, draft: seededDraft });
}

async function chooseSyncMode(page: Page, mode: 'Receive' | 'Send') {
  const direction = page.locator('details').filter({ hasText: 'Direction' });
  await direction.locator('summary').click();
  await direction.getByRole('button', { name: new RegExp(`^${mode}`, 'i') }).click();
}

async function openFileDetails(page: Page, text: string) {
  const details = page.locator('details');
  const count = await details.count();
  for (let index = 0; index < count; index += 1) {
    const detail = details.nth(index);
    const isOpen = await detail.evaluate((element) => (element as HTMLDetailsElement).open);
    if (!isOpen) {
      await detail.locator(':scope > summary').click();
    }
  }
  await expect(page.getByText(text).first()).toBeVisible();
  return details;
}

test('exports and restores a full v3 local backup', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-05-11T10:15:00'));
  await seedFullLocalState(page);

  await page.goto('/sync');
  await chooseSyncMode(page, 'Send');
  await openFileDetails(page, 'Save backup file');
  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /save backup file/i }).click(),
  ]).then(([downloadEvent]) => downloadEvent);
  const backupPath = testInfo.outputPath('liftday-v2-backup.json');
  await download.saveAs(backupPath);

  const exported = JSON.parse(await readFile(backupPath, 'utf8')) as {
    schemaVersion: number;
    sessions: Record<string, unknown>;
    dailyLogs: Record<string, unknown>;
    progressPhotos: unknown[];
    activeWorkoutDraft: unknown;
    onboardingCompleted: boolean;
  };
  expect(exported.schemaVersion).toBe(3);
  expect(Object.keys(exported.sessions)).toContain('2026-05-11');
  expect(Object.keys(exported.dailyLogs)).toContain('2026-05-11');
  expect(exported.progressPhotos).toHaveLength(1);
  expect(exported.activeWorkoutDraft).not.toBeNull();
  expect(exported.onboardingCompleted).toBe(true);

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await chooseSyncMode(page, 'Receive');
  await openFileDetails(page, 'Import from file');
  await page.locator('input[type="file"]').setInputFiles(backupPath);
  await page.getByRole('button', { name: /^import$/i }).click();

  await expect.poll(() => page.evaluate(() => localStorage.getItem('traindaily_sessions'))).toContain('cable_lateral_raise');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('liftday_daily_logs'))).toContain('Backup fixture');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('liftday_progress_photos'))).toContain('photo-2026-05-11');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('liftday_active_workout_draft'))).toContain('2026-05-11T10:05:00.000Z');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('liftday_onboarding_completed'))).toBe('true');

  await page.goto('/history');
  await expect(page.locator('body')).toContainText('Progress');
  await expect(page.locator('body')).toContainText('Command');

  await page.goto('/program');
  await expect(page.locator('body')).toContainText('Command');

  await page.goto('/muscles');
  await page.getByRole('button', { name: '7 days' }).click();
  await expect(page.locator('body')).toContainText('Logged work');
  await expect(page.locator('.body-chart-muscle')).not.toHaveCount(0);

  await page.goto('/');
  await expect(page.getByRole('button', { name: /log set/i })).toBeVisible();
});

test('exports a backup from the desktop receive view', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-05-11T10:15:00'));
  await seedFullLocalState(page);

  await page.goto('/sync');
  await openFileDetails(page, 'Save backup file');
  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /save backup file/i }).click(),
  ]).then(([downloadEvent]) => downloadEvent);
  const backupPath = testInfo.outputPath('liftday-desktop-backup.json');
  await download.saveAs(backupPath);

  const exported = JSON.parse(await readFile(backupPath, 'utf8')) as {
    schemaVersion: number;
    source: string;
    sessions: Record<string, unknown>;
    progressPhotos: unknown[];
    onboardingCompleted: boolean;
  };
  expect(exported.schemaVersion).toBe(3);
  expect(exported.source).toBe('laptop');
  expect(Object.keys(exported.sessions)).toContain('2026-05-11');
  expect(exported.progressPhotos).toHaveLength(1);
  expect(exported.onboardingCompleted).toBe(true);
});

test('phone pairing reports when the opened URL has no local data', async ({ page }) => {
  await page.goto('/sync');
  await chooseSyncMode(page, 'Send');
  const manualPairing = page.locator('details').filter({ hasText: 'Manual pairing' });
  await manualPairing.locator('summary').click();
  await manualPairing.getByRole('textbox').first().fill('not a real offer');
  await manualPairing.getByRole('button', { name: /create answer/i }).click();

  await expect(page.getByText('Retry')).toBeVisible();
  await expect(page.getByText(/No phone data was found here/i)).toBeVisible();
});

test('WebRTC pairing payloads validate version, expiry, SDP, and session', async () => {
  const offer = await encodePairingPayload(WEBRTC_OFFER_TYPE, 'session-a', {
    type: 'offer',
    sdp: 'v=0\r\na=group:BUNDLE 0\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\n',
  }, new Date('2026-05-11T10:00:00.000Z'));

  const decoded = await decodePairingPayload(offer, WEBRTC_OFFER_TYPE, {
    expectedSessionId: 'session-a',
    now: new Date('2026-05-11T10:01:00.000Z'),
  });
  expect(decoded.type).toBe('offer');
  expect(decoded.sessionId).toBe('session-a');
  expect(decoded.sdp).toContain('webrtc-datachannel');

  await expect(decodePairingPayload(offer, WEBRTC_ANSWER_TYPE, {
    now: new Date('2026-05-11T10:01:00.000Z'),
  })).rejects.toThrow(/wrong sync step/i);

  await expect(decodePairingPayload(offer, WEBRTC_OFFER_TYPE, {
    expectedSessionId: 'session-b',
    now: new Date('2026-05-11T10:01:00.000Z'),
  })).rejects.toThrow(/different sync session/i);

  await expect(decodePairingPayload(offer, WEBRTC_OFFER_TYPE, {
    now: new Date('2026-05-11T10:20:01.000Z'),
  })).rejects.toThrow(/expired/i);

  const malformed = JSON.stringify({
    app: 'liftday',
    type: WEBRTC_OFFER_TYPE,
    sessionId: 'session-a',
    createdAt: '2026-05-11T10:00:00.000Z',
    sdp: 'bm90LXNkcA',
    compressed: false,
  });
  await expect(decodePairingPayload(malformed, WEBRTC_OFFER_TYPE, {
    now: new Date('2026-05-11T10:01:00.000Z'),
  })).rejects.toThrow(/malformed/i);
});

test('laptop direct sync renders an offer QR with copy fallback', async ({ page }) => {
  await page.goto('/sync');

  await expect(page.getByText('Step 1: phone scan', { exact: true })).toBeVisible();
  await expect(page.getByAltText('LiftDay WebRTC offer QR code')).toBeVisible({ timeout: 15_000 });

  const answerDetails = page.locator('details').filter({ hasText: 'Step 2: laptop answer' });
  await answerDetails.locator('summary').click();
  await expect.poll(() => answerDetails.getByRole('textbox').nth(1).inputValue()).toContain('/sync?offer=');
  await expect.poll(() => answerDetails.getByRole('textbox').nth(2).inputValue()).toContain(WEBRTC_OFFER_TYPE);
});

test('phone opens a laptop offer link and shows an answer QR', async ({ browser }) => {
  const context = await browser.newContext();
  const laptop = await context.newPage();
  const phone = await context.newPage();
  await seedFullLocalState(phone);

  await laptop.goto('/sync');
  await expect(laptop.getByAltText('LiftDay WebRTC offer QR code')).toBeVisible({ timeout: 15_000 });
  const offerDetails = laptop.locator('details').filter({ hasText: 'Step 2: laptop answer' });
  await offerDetails.locator('summary').click();
  const offerLink = await offerDetails.getByRole('textbox').nth(1).inputValue();

  await phone.goto(offerLink);
  const manualPairing = phone.locator('details').filter({ hasText: 'Manual pairing' });
  await manualPairing.locator('summary').click();

  await expect(phone.getByAltText('LiftDay WebRTC answer QR code')).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => manualPairing.getByRole('textbox').nth(1).inputValue()).toContain(WEBRTC_ANSWER_TYPE);

  await context.close();
});

test('laptop ignores a duplicate phone answer instead of showing WebRTC state errors', async ({ browser }) => {
  const context = await browser.newContext();
  const laptop = await context.newPage();
  const phone = await context.newPage();
  await seedFullLocalState(phone);

  await laptop.goto('/sync');
  await expect(laptop.getByAltText('LiftDay WebRTC offer QR code')).toBeVisible({ timeout: 15_000 });
  const laptopAnswerDetails = laptop.locator('details').filter({ hasText: 'Step 2: laptop answer' });
  await laptopAnswerDetails.locator('summary').click();
  const offerLink = await laptopAnswerDetails.getByRole('textbox').nth(1).inputValue();

  await phone.goto(offerLink);
  const manualPairing = phone.locator('details').filter({ hasText: 'Manual pairing' });
  await manualPairing.locator('summary').click();
  await expect(phone.getByAltText('LiftDay WebRTC answer QR code')).toBeVisible({ timeout: 15_000 });
  const answer = await manualPairing.getByRole('textbox').nth(1).inputValue();

  const laptopAnswerBox = laptopAnswerDetails.getByRole('textbox').first();
  await laptopAnswerBox.fill(answer);
  await laptopAnswerDetails.getByRole('button', { name: /use answer/i }).click();
  await expect(laptop.getByText(/Connected|Waiting for phone backup/i)).toBeVisible();
  await laptopAnswerDetails.getByRole('button', { name: /use answer/i }).click();
  await expect(laptop.locator('body')).not.toContainText(/wrong state: stable|setRemoteDescription/i);

  await context.close();
});

test('imports a v1 sync file without losing current session compatibility', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date('2026-05-11T10:15:00'));
  await page.addInitScript(() => {
    localStorage.setItem('liftday_onboarding_completed', 'true');
  });

  const backupPath = testInfo.outputPath('liftday-v1-sync.json');
  await testInfo.attach('v1-sync-source', {
    body: JSON.stringify({
      app: 'liftday',
      schemaVersion: 1,
      exportedAt: '2026-05-11T10:00:00.000Z',
      source: 'phone',
      data: {
        '2026-05-11': seededSession,
      },
      profile: seededProfile,
      firstSessionDate: '2026-05-01',
      mobilityDoneDate: '2026-05-10',
    }),
    contentType: 'application/json',
  });
  await page.goto('/sync');
  await page.evaluate((content) => {
    localStorage.setItem('test_v1_sync_content', content);
  }, JSON.stringify({
    app: 'liftday',
    schemaVersion: 1,
    exportedAt: '2026-05-11T10:00:00.000Z',
    source: 'phone',
    data: {
      '2026-05-11': seededSession,
    },
    profile: seededProfile,
    firstSessionDate: '2026-05-01',
    mobilityDoneDate: '2026-05-10',
  }));
  const v1Content = await page.evaluate(() => localStorage.getItem('test_v1_sync_content')!);
  await writeFile(backupPath, v1Content);

  await chooseSyncMode(page, 'Receive');
  await openFileDetails(page, 'Import from file');
  await page.locator('input[type="file"]').setInputFiles(backupPath);
  await page.getByRole('button', { name: /^import$/i }).click();

  await expect.poll(() => page.evaluate(() => localStorage.getItem('traindaily_sessions'))).toContain('db_incline_press');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('liftday_user_profile'))).toContain('E2E backup fixture');

  await page.goto('/history');
  await expect(page.locator('body')).toContainText('Progress');
  await page.goto('/program');
  await expect(page.locator('body')).toContainText('Command');
});
