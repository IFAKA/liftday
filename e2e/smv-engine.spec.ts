import { expect, test } from '@playwright/test';
import { getDefaultProfile, migrateDailyLogs, migrateWorkoutData } from '@/lib/storage';
import { getRecoveryState } from '@/lib/adaptation/recovery-engine';
import { getFatigueState } from '@/lib/adaptation/fatigue-engine';
import { getProgressionQuality } from '@/lib/adaptation/progression-engine';
import { getAdaptiveRecommendations } from '@/lib/adaptation/recommendation-engine';
import { smvVelocityPerRecoverableFatigue } from '@/lib/adaptation/objective';
import { getEffectiveWeeklyVolume } from '@/lib/adaptation/volume-engine';
import { optimizeRoutineForFrontier } from '@/lib/frontier-optimizer';
import { getResolvedSessionPlan } from '@/lib/routine-plan';
import { assessSetCoaching } from '@/lib/set-coaching';
import {
  calculateRoutineVolume,
  evaluateDoubleProgression,
  getNutritionAdjustment,
  getPrescriptionForChain,
  getRankedSubstitutions,
  shouldDeload,
} from '@/lib/smv';
import { gymRoutine } from '@/lib/routines/gym';
import { getChainsForRoutine } from '@/lib/tiers';

const testPrescription = {
  exerciseKey: 'smith_incline_press' as const,
  sets: 3,
  minReps: 8,
  maxReps: 10,
  targetRir: '1-2 RIR',
  targetRirMin: 1,
  targetRirMax: 2,
  restSeconds: 90,
  restLabel: '90 sec',
  cue: 'Clean reps.',
};

test('calculates weekly SMV volume with indirect sets', () => {
  const optimized = optimizeRoutineForFrontier(gymRoutine, getDefaultProfile(), {}, 3);
  const volume = calculateRoutineVolume(optimized.routine, getDefaultProfile(), 3);

  expect(volume.side_delt).toBeGreaterThanOrEqual(16);
  expect(volume.side_delt).toBeLessThanOrEqual(20);
  expect(volume.rear_delt).toBeGreaterThanOrEqual(9);
  expect(volume.rear_delt).toBeLessThanOrEqual(12);
  expect(volume.chest).toBeGreaterThanOrEqual(12);
  expect(volume.triceps).toBeGreaterThanOrEqual(13);
  expect(volume.biceps).toBeGreaterThanOrEqual(11);
  expect(volume.quads).toBeGreaterThanOrEqual(7);
  expect(volume.quads).toBeLessThanOrEqual(8);
  expect(optimized.sessionDurations.every((session) => session.minutes <= 105)).toBe(true);
  expect(optimized.sessionDurations.some((session) => session.minutes >= 60)).toBe(true);
});

test('SMV optimizer rejects unavailable idealized machines and reports allocation constraints', () => {
  const optimized = optimizeRoutineForFrontier(gymRoutine, getDefaultProfile(), {}, 3);
  const selected = optimized.selectedSlots.map((slot) => slot.exercise);

  expect(selected).not.toContain('Smith Incline Press');
  expect(selected).not.toContain('Machine Shoulder Press');
  expect(selected).not.toContain('Machine Lateral Raise');
  expect(optimized.reasons.join(' ')).toMatch(/indirect-set-aware/i);
  expect(optimized.allocationRationale.join(' ')).toMatch(/Legs are maintenance-support/i);
  expect(optimized.progressionAssumptions.join(' ')).toMatch(/target RIR/i);
  expect(optimized.recoveryBottlenecks.join(' ')).toMatch(/Shoulder local tissue/i);
  expect(optimized.longTermExpectations.join(' ')).toMatch(/4-8 weeks/i);
});

test('normal session execution enforces productive hard-set floors without changing the split', () => {
  const profile = getDefaultProfile();
  const optimized = optimizeRoutineForFrontier(gymRoutine, profile, {}, 3);

  for (const workoutType of gymRoutine.schedule) {
    const chains = getChainsForRoutine(optimized.routine, workoutType);
    const plan = getResolvedSessionPlan(optimized.routine, workoutType, chains, profile.tiers, 3);
    const totalSets = plan.reduce((sum, item) => sum + item.setCount, 0);
    const directArmSets = plan
      .filter((item) => item.exercise.primaryMuscle === 'biceps' || item.exercise.primaryMuscle === 'triceps')
      .map((item) => item.setCount);

    expect(plan.every((item) => item.setCount >= 2)).toBe(true);
    expect(directArmSets.every((sets) => sets >= 2)).toBe(true);
    expect(totalSets).toBeGreaterThanOrEqual(workoutType === 'legs_maintenance' ? 12 : 15);
  }
});

test('generated frontier routine does not optimize normal sessions down to minimum-effective doses', () => {
  const profile = { ...getDefaultProfile(), goal: '__generated_frontier__' };
  const optimized = optimizeRoutineForFrontier(gymRoutine, profile, {}, 3);

  for (const workoutType of gymRoutine.schedule) {
    const chains = getChainsForRoutine(optimized.routine, workoutType);
    const plan = getResolvedSessionPlan(optimized.routine, workoutType, chains, profile.tiers, 3);
    const totalSets = plan.reduce((sum, item) => sum + item.setCount, 0);

    expect(plan.every((item) => item.setCount >= 2)).toBe(true);
    expect(totalSets).toBeGreaterThanOrEqual(workoutType === 'legs_maintenance' ? 12 : 15);
  }
});

test('requires top reps at target RIR before increasing load', () => {
  const chain = gymRoutine.tierChains.find((entry) => entry.slotId === 'push_a_incline_db');
  expect(chain).toBeTruthy();
  const prescription = getPrescriptionForChain(chain!, 'db_incline_press', 3);

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

test('coaches sets with RIR-normalized performance, not raw load only', () => {
  expect(assessSetCoaching({
    unit: 'weighted',
    reps: 9,
    weight: 42.5,
    rir: 0,
    prescription: testPrescription,
    previous: { reps: 10, weight: 40, rir: 2 },
  }).label).toBe('Reduce load');

  expect(assessSetCoaching({
    unit: 'weighted',
    reps: 10,
    weight: 40,
    rir: 2,
    prescription: testPrescription,
    priorSets: [
      { reps: 10, weight: 40, rir: 2 },
      { reps: 10, weight: 40, rir: 1 },
    ],
    plannedSets: 3,
  }).label).toBe('Progress next time');

  const tooEasy = assessSetCoaching({
    unit: 'weighted',
    reps: 8,
    weight: 40,
    rir: 4,
    prescription: testPrescription,
  });
  expect(tooEasy.label).toBe('Too easy');
  expect(tooEasy.detail).toMatch(/top reps/i);

  expect(assessSetCoaching({
    unit: 'weighted',
    reps: 7,
    weight: 40,
    rir: 0,
    prescription: testPrescription,
    previous: { reps: 8, weight: 40, rir: 1 },
  }).label).toBe('Reduce load');
});

test('detects deload and waist calorie adjustment triggers', () => {
  expect(shouldDeload({
    recentScores: [
      { score: 95, rir: 2 },
      { score: 100, rir: 2 },
    ],
  })).toBe(false);

  expect(shouldDeload({
    recentScores: [
      { score: 90, rir: 2 },
      { score: 95, rir: 2 },
      { score: 100, rir: 2 },
    ],
  })).toBe(true);

  expect(shouldDeload({ recentScores: [], poorSleepDays: 3 })).toBe(true);
  expect(shouldDeload({ recentScores: [], jointPain: true })).toBe(true);
  expect(getNutritionAdjustment(0.6, 2).calorieDelta).toBe(-150);
  expect(getNutritionAdjustment(0.3, 2).calorieDelta).toBe(0);
});

test('ranks crowded-gym substitutions and migrates legacy set entries', () => {
  const chain = gymRoutine.tierChains.find((entry) => entry.slotId === 'push_a_incline_db');
  expect(chain).toBeTruthy();

  expect(getRankedSubstitutions(chain!, ['dumbbells'])).toEqual([
    'high_incline_machine_press',
    'barbell_bench_press',
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

test('calculates adaptive effective volume, recovery, fatigue, and recommendations', () => {
  const profile = getDefaultProfile();
  const today = new Date('2026-05-10T12:00:00');
  const data = migrateWorkoutData({
    '2026-05-08': {
      logged_at: '2026-05-08T10:00:00.000Z',
      week_number: 1,
      workout_type: 'push',
      barbell_bench_press: [
        { reps: 8, weight: 70, rir: 1 },
        { reps: 8, weight: 70, rir: 1 },
        { reps: 8, weight: 70, rir: 2 },
      ],
      db_lateral_raise: [
        { reps: 14, weight: 10, rir: 2 },
        { reps: 13, weight: 10, rir: 2 },
      ],
    },
    '2026-05-05': {
      logged_at: '2026-05-05T10:00:00.000Z',
      week_number: 1,
      workout_type: 'legs',
      romanian_deadlift: [
        { reps: 10, weight: 90, rir: 1 },
        { reps: 9, weight: 90, rir: 1 },
        { reps: 9, weight: 90, rir: 1 },
      ],
    },
  });
  const logs = migrateDailyLogs({
    '2026-05-10': {
      dateKey: '2026-05-10',
      sleepHours: 6,
      fatigue: 4,
      jointPain: true,
      muscleSoreness: { hamstrings: 4 },
    },
  });
  const effectiveVolume = getEffectiveWeeklyVolume({ data, routine: gymRoutine, profile, fallbackSets: 3, today });
  const recovery = getRecoveryState({ data, dailyLogs: logs, today });
  const fatigue = getFatigueState({ data, dailyLogs: logs, recovery, today });
  const progression = getProgressionQuality({ data, recovery, fatigue, effectiveVolume });
  const context = getAdaptiveRecommendations({ recovery, fatigue, progression, effectiveVolume, profile, today });

  expect(effectiveVolume.find((entry) => entry.muscle === 'chest')?.sets).toBeGreaterThan(2);
  expect(recovery.muscles.side_delt!.recoveryState).toBeGreaterThan(recovery.muscles.hamstrings!.recoveryState);
  expect(fatigue.axialFatigue).toBeGreaterThan(0);
  expect(fatigue.jointRisk).toBeGreaterThan(0);
  expect(context.mode).toBe('recommend-first');
  expect(context.recommendations[0].reason.length).toBeGreaterThan(10);
});

test('low effective volume with usable recovery recommends add-volume guidance', () => {
  const context = getAdaptiveRecommendations({
    recovery: {
      systemic: 0.85,
      muscles: { side_delt: { muscle: 'side_delt', recoveryState: 0.82, fatigueLoad: 0.1, soreness: 0, halfLifeHours: 24 } },
      bottleneck: null,
      generatedAt: '2026-05-10T00:00:00.000Z',
    },
    fatigue: {
      localMuscleFatigue: { side_delt: 0.2 },
      connectiveTissueFatigue: {},
      axialFatigue: 0.1,
      systemicFatigue: 0.15,
      jointRisk: 0.1,
      bottlenecks: [],
    },
    progression: [{
      trend: 'undertraining',
      velocity: 0,
      confidence: 0.7,
      exerciseKey: 'db_lateral_raise',
      muscle: 'side_delt',
      reasons: ['Effective weekly volume is below the productive floor.'],
    }],
    effectiveVolume: [{ muscle: 'side_delt', sets: 6, target: 22, minimum: 18, priorityRank: 1, status: 'low' }],
    profile: getDefaultProfile(),
    today: new Date('2026-05-10T00:00:00'),
  });

  expect(context.recommendations[0].action).toBe('add_volume');
  expect(context.recommendations[0].reason).toMatch(/below target while recovery is usable/i);
});

test('single performance dip does not trigger auto volume reduction during normal training', () => {
  const context = getAdaptiveRecommendations({
    recovery: {
      systemic: 0.8,
      muscles: { side_delt: { muscle: 'side_delt', recoveryState: 0.76, fatigueLoad: 0.2, soreness: 0, halfLifeHours: 24 } },
      bottleneck: null,
      generatedAt: '2026-05-10T00:00:00.000Z',
    },
    fatigue: {
      localMuscleFatigue: { side_delt: 0.6 },
      connectiveTissueFatigue: {},
      axialFatigue: 0.1,
      systemicFatigue: 0.2,
      jointRisk: 0.2,
      bottlenecks: [],
    },
    progression: [{
      trend: 'junk_volume',
      velocity: -3,
      confidence: 0.72,
      exerciseKey: 'db_lateral_raise',
      muscle: 'side_delt',
      reasons: ['Volume is above target without a matching performance gain.'],
    }],
    effectiveVolume: [{ muscle: 'side_delt', sets: 30, target: 22, minimum: 18, priorityRank: 1, status: 'high' }],
    profile: getDefaultProfile(),
    today: new Date('2026-05-10T00:00:00'),
  });

  expect(context.recommendations.some((entry) => entry.action === 'reduce_volume')).toBe(false);
});

test('primary objective favors recoverable velocity over excessive raw volume and ignores target date in score', () => {
  const base = {
    recovery: {
      systemic: 0.85,
      muscles: {},
      bottleneck: null,
      generatedAt: '2026-05-10T00:00:00.000Z',
    },
    fatigue: {
      localMuscleFatigue: {},
      connectiveTissueFatigue: {},
      axialFatigue: 0.1,
      systemicFatigue: 0.1,
      jointRisk: 0.1,
      bottlenecks: [],
    },
  };
  const efficient = smvVelocityPerRecoverableFatigue({
    ...base,
    effectiveVolume: [{ muscle: 'side_delt', sets: 12, target: 22, minimum: 18, priorityRank: 1, status: 'low' }],
    targetDate: '2026-10-31',
    today: new Date('2026-05-10T00:00:00'),
  });
  const excessive = smvVelocityPerRecoverableFatigue({
    recovery: { ...base.recovery, systemic: 0.35 },
    fatigue: { ...base.fatigue, axialFatigue: 0.9, systemicFatigue: 0.95, jointRisk: 0.8 },
    effectiveVolume: [{ muscle: 'side_delt', sets: 30, target: 22, minimum: 18, priorityRank: 1, status: 'high' }],
    targetDate: '2026-10-31',
    today: new Date('2026-05-10T00:00:00'),
  });
  const differentDate = smvVelocityPerRecoverableFatigue({
    ...base,
    effectiveVolume: [{ muscle: 'side_delt', sets: 12, target: 22, minimum: 18, priorityRank: 1, status: 'low' }],
    targetDate: '2026-11-30',
    today: new Date('2026-05-10T00:00:00'),
  });

  expect(efficient).toBeGreaterThan(excessive);
  expect(differentDate).toBe(efficient);
});
