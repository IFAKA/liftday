import { expect, test } from '@playwright/test';
import { getDefaultProfile, migrateWorkoutData } from '@/lib/storage';
import {
  calculateRoutineVolume,
  evaluateDoubleProgression,
  getNutritionAdjustment,
  getPrescriptionForChain,
  getRankedSubstitutions,
  shouldDeload,
} from '@/lib/smv';
import { gymRoutine } from '@/lib/routines/gym';

test('calculates weekly SMV volume with indirect sets', () => {
  const volume = calculateRoutineVolume(gymRoutine, getDefaultProfile(), 3);

  expect(volume.side_delt).toBeGreaterThanOrEqual(18);
  expect(volume.rear_delt).toBeGreaterThanOrEqual(12);
  expect(volume.chest).toBeGreaterThanOrEqual(12);
  expect(volume.triceps).toBeGreaterThan(10);
  expect(volume.biceps).toBeGreaterThan(10);
  expect(volume.quads).toBe(3);
});

test('requires top reps at target RIR before increasing load', () => {
  const chain = gymRoutine.tierChains.find((entry) => entry.slotId === 'push_a_smith_incline');
  expect(chain).toBeTruthy();
  const prescription = getPrescriptionForChain(chain!, 'smith_incline_press', 3);

  expect(evaluateDoubleProgression([
    { reps: 10, weight: 50, rir: 2 },
    { reps: 10, weight: 50, rir: 1 },
    { reps: 10, weight: 50, rir: 2 },
  ], prescription).increaseLoad).toBe(true);

  expect(evaluateDoubleProgression([
    { reps: 10, weight: 50, rir: 2 },
    { reps: 9, weight: 50, rir: 1 },
    { reps: 10, weight: 50, rir: 2 },
  ], prescription).increaseLoad).toBe(false);
});

test('detects deload and waist calorie adjustment triggers', () => {
  expect(shouldDeload({
    recentScores: [
      { score: 95, rir: 2 },
      { score: 100, rir: 2 },
    ],
  })).toBe(true);

  expect(shouldDeload({ recentScores: [], poorSleepDays: 3 })).toBe(true);
  expect(getNutritionAdjustment(0.6, 2).calorieDelta).toBe(-150);
  expect(getNutritionAdjustment(0.3, 2).calorieDelta).toBe(0);
});

test('ranks crowded-gym substitutions and migrates legacy set entries', () => {
  const chain = gymRoutine.tierChains.find((entry) => entry.slotId === 'push_a_smith_incline');
  expect(chain).toBeTruthy();

  expect(getRankedSubstitutions(chain!, ['smith_machine'])).toEqual([
    'db_incline_press',
    'high_incline_machine_press',
  ]);

  const migrated = migrateWorkoutData({
    '2026-05-04': {
      logged_at: '2026-05-04T10:00:00.000Z',
      week_number: 1,
      workout_type: 'push_a',
      smith_incline_press: [8, { reps: 9, weight: 40 }],
    },
  });

  expect(migrated['2026-05-04'].smith_incline_press).toEqual([
    { reps: 8, weight: 0, rir: 2 },
    { reps: 9, weight: 40, rir: 2 },
  ]);
});
