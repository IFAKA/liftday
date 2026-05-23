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
import { getNextSetAutoAdjust } from '@/lib/workout-auto-adjust';
import { getNextHigherLoad, getNextLowerLoad, snapLoadTarget } from '@/lib/load-targets';
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
import type { FatigueState, MuscleGroup, RecoveryState, SetEntry, WorkoutSession, WorkoutType } from '@/lib/types';

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

function session(
  workoutType: Exclude<WorkoutType, 'rest'>,
  exercises: Partial<Record<string, SetEntry[]>>
): WorkoutSession {
  return {
    logged_at: '2026-05-08T10:00:00.000Z',
    week_number: 1,
    workout_type: workoutType,
    ...exercises,
  } as WorkoutSession;
}

function baseRecovery(muscles: Partial<Record<MuscleGroup, number>>, systemic = 0.84): RecoveryState {
  return {
    systemic,
    muscles: Object.fromEntries(
      Object.entries(muscles).map(([muscle, recoveryState]) => [
        muscle,
        { muscle, recoveryState, fatigueLoad: 0.1, soreness: 0, halfLifeHours: 24 },
      ])
    ) as RecoveryState['muscles'],
    bottleneck: null,
    generatedAt: '2026-05-10T00:00:00.000Z',
  };
}

function baseFatigue(
  localMuscleFatigue: Partial<Record<MuscleGroup, number>>,
  overrides: Partial<Pick<FatigueState, 'axialFatigue' | 'systemicFatigue' | 'jointRisk' | 'bottlenecks'>> = {}
): FatigueState {
  return {
    localMuscleFatigue,
    connectiveTissueFatigue: {},
    axialFatigue: overrides.axialFatigue ?? 0.1,
    systemicFatigue: overrides.systemicFatigue ?? 0.16,
    jointRisk: overrides.jointRisk ?? 0.1,
    bottlenecks: overrides.bottlenecks ?? [],
  };
}

test('calculates weekly SMV volume with indirect sets', () => {
  const optimized = optimizeRoutineForFrontier(gymRoutine, getDefaultProfile(), {}, 3);
  const volume = calculateRoutineVolume(optimized.routine, getDefaultProfile(), 3);

  expect(volume.side_delt).toBeGreaterThanOrEqual(12);
  expect(volume.side_delt).toBeLessThanOrEqual(14);
  expect(volume.rear_delt).toBeGreaterThanOrEqual(9);
  expect(volume.rear_delt).toBeLessThanOrEqual(12);
  expect(volume.chest).toBeGreaterThanOrEqual(12);
  expect(volume.triceps).toBeGreaterThanOrEqual(13);
  expect(volume.biceps).toBeGreaterThanOrEqual(11);
  expect(volume.quads).toBeGreaterThanOrEqual(6);
  expect(volume.quads).toBeLessThanOrEqual(7);
  expect(optimized.sessionDurations.every((session) => session.minutes <= 105)).toBe(true);
  expect(optimized.sessionDurations.some((session) => session.minutes >= 45)).toBe(true);
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

test('auto-adjusts next workout set from RIR, reps, prior sets, and program guardrails', () => {
  expect(getNextSetAutoAdjust({
    unit: 'weighted',
    loggedSet: { reps: 8, weight: 40, rir: 4 },
    prescription: testPrescription,
  })).toMatchObject({
    reps: 10,
    weight: 40,
    rir: 2,
    status: 'Add reps',
  });

  expect(getNextSetAutoAdjust({
    unit: 'weighted',
    loggedSet: { reps: 8, weight: 40, rir: 0 },
    prescription: testPrescription,
    priorSets: [{ reps: 10, weight: 40, rir: 2 }],
  })).toMatchObject({
    weight: 37.5,
    status: 'Reduce load',
  });

  expect(getNextSetAutoAdjust({
    unit: 'weighted',
    loggedSet: { reps: 7, weight: 40, rir: 1 },
    prescription: testPrescription,
  })).toMatchObject({
    weight: 37.5,
    reps: 8,
    status: 'Reduce load',
  });

  expect(getNextSetAutoAdjust({
    unit: 'weighted',
    loggedSet: { reps: 10, weight: 40, rir: 4 },
    prescription: testPrescription,
    priorSets: [
      { reps: 10, weight: 40, rir: 3 },
      { reps: 10, weight: 40, rir: 3 },
    ],
  })).toMatchObject({
    weight: 42.5,
    reps: 8,
    status: 'Small jump next',
  });

  expect(getNextSetAutoAdjust({
    unit: 'weighted',
    loggedSet: { reps: 10, weight: 40, rir: 4 },
    prescription: testPrescription,
    priorSets: [
      { reps: 10, weight: 40, rir: 3 },
      { reps: 10, weight: 40, rir: 3 },
    ],
    topRecommendation: {
      action: 'deload',
      title: 'Deload First',
      summary: 'Fatigue is hiding output.',
      reason: 'Recovery is constrained.',
      stimulusGain: 0,
      fatigueCost: -28,
      recoveryState: 0.4,
      blockedConstraints: [],
      confidence: 0.8,
    },
  })).toMatchObject({
    weight: 37.5,
    status: 'Reduce load',
    programContext: 'Program says Deload First: Fatigue is hiding output.',
  });

  expect(getNextSetAutoAdjust({
    unit: 'weighted',
    loggedSet: { reps: 10, weight: 40, rir: 4 },
    prescription: testPrescription,
    priorSets: [
      { reps: 10, weight: 40, rir: 3 },
      { reps: 10, weight: 40, rir: 3 },
    ],
    topRecommendation: {
      action: 'hold_progression',
      muscle: 'chest',
      title: 'Hold Chest',
      summary: 'Keep load steady today.',
      reason: 'local recovery is below the add-volume threshold',
      stimulusGain: 0,
      fatigueCost: 0,
      recoveryState: 0.5,
      blockedConstraints: ['local recovery is below the add-volume threshold'],
      confidence: 0.7,
    },
  })).toMatchObject({
    weight: 40,
    status: 'Hold',
    programContext: 'Program says Hold Chest: Keep load steady today.',
  });

  expect(getNextSetAutoAdjust({
    unit: 'weighted',
    loggedSet: { reps: 9, weight: 40, rir: 2 },
    prescription: testPrescription,
    currentSuggestion: { reps: 10, weight: 40, rir: 2 },
  }).warning).toMatch(/changed the target/i);
});

test('snaps recommendation loads to valid exercise increments', () => {
  expect([4, 4.5, 5.5, 6.5]).not.toContain(snapLoadTarget('cable_lateral_raise', 6.5, 'nearest'));
  expect(getNextLowerLoad('cable_lateral_raise', 6.5)).toBe(5);
  expect(getNextHigherLoad('cable_lateral_raise', 6.5)).toBe(7.5);
  expect(snapLoadTarget('hammer_curl', 11.5, 'nearest')).toBe(12.5);

  expect(getNextSetAutoAdjust({
    exerciseKey: 'cable_lateral_raise',
    unit: 'weighted',
    loggedSet: { reps: 7, weight: 6.5, rir: 1 },
    prescription: { ...testPrescription, exerciseKey: 'cable_lateral_raise', minReps: 12, maxReps: 20 },
  })).toMatchObject({
    weight: 5,
    status: 'Reduce load',
  });

  expect(getNextSetAutoAdjust({
    exerciseKey: 'hammer_curl',
    unit: 'weighted',
    loggedSet: { reps: 7, weight: 11.5, rir: 1 },
    prescription: testPrescription,
  })).toMatchObject({
    weight: 10,
    status: 'Reduce load',
  });
});

test('no reference and hard-but-valid sets avoid noisy load reductions', () => {
  expect(getNextSetAutoAdjust({
    exerciseKey: 'cable_lateral_raise',
    unit: 'weighted',
    loggedSet: { reps: 12, weight: 6.5, rir: 0 },
    prescription: { ...testPrescription, exerciseKey: 'cable_lateral_raise', minReps: 12, maxReps: 20 },
  })).toMatchObject({
    weight: 7.5,
    status: 'Add rest',
  });

  expect(getNextSetAutoAdjust({
    exerciseKey: 'cable_lateral_raise',
    unit: 'weighted',
    loggedSet: { reps: 11, weight: 6.5, rir: 1 },
    prescription: { ...testPrescription, exerciseKey: 'cable_lateral_raise', minReps: 12, maxReps: 20 },
  })).toMatchObject({
    weight: 5,
    status: 'Reduce load',
  });
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

test('heavier load below target reps becomes build-reps guidance', () => {
  const profile = getDefaultProfile();
  const effectiveVolume = [{ muscle: 'chest' as const, sets: 12, target: 16, minimum: 12, priorityRank: 2, status: 'productive' as const }];
  const recovery = baseRecovery({ chest: 0.82 });
  const fatigue = baseFatigue({ chest: 0.2 });
  const progression = getProgressionQuality({
    data: migrateWorkoutData({
      '2026-05-08': session('push_b', { db_incline_press: [{ reps: 6, weight: 60, rir: 1 }] }),
      '2026-05-01': session('push_b', { db_incline_press: [{ reps: 10, weight: 50, rir: 2 }] }),
    }),
    recovery,
    fatigue,
    effectiveVolume,
    routine: gymRoutine,
    profile,
    fallbackSets: 3,
  });

  expect(progression[0].trend).toBe('build_reps');
  expect(progression[0].reasons[0]).toMatch(/repeat or reduce load/i);
});

test('low volume plus build-reps guidance does not recommend adding sets', () => {
  const profile = getDefaultProfile();
  const effectiveVolume = [{ muscle: 'chest' as const, sets: 8, target: 16, minimum: 12, priorityRank: 2, status: 'low' as const }];
  const recovery = baseRecovery({ chest: 0.84 });
  const fatigue = baseFatigue({ chest: 0.18 });
  const progression = getProgressionQuality({
    data: migrateWorkoutData({
      '2026-05-08': session('push_b', { db_incline_press: [{ reps: 6, weight: 60, rir: 1 }] }),
      '2026-05-01': session('push_b', { db_incline_press: [{ reps: 10, weight: 50, rir: 2 }] }),
    }),
    recovery,
    fatigue,
    effectiveVolume,
    routine: gymRoutine,
    profile,
    fallbackSets: 3,
  });
  const context = getAdaptiveRecommendations({ recovery, fatigue, progression, effectiveVolume, profile, today: new Date('2026-05-10T00:00:00') });

  expect(context.recommendations[0].action).toBe('hold_progression');
  expect(context.recommendations[0].title).toBe('Build Chest Reps');
  expect(context.recommendations[0].summary).toBe('Repeat or reduce load.');
});

test('top reps at target RIR stays productive progression', () => {
  const profile = getDefaultProfile();
  const effectiveVolume = [{ muscle: 'chest' as const, sets: 12, target: 16, minimum: 12, priorityRank: 2, status: 'productive' as const }];
  const progression = getProgressionQuality({
    data: migrateWorkoutData({
      '2026-05-08': session('push_b', { db_incline_press: [{ reps: 12, weight: 50, rir: 2 }] }),
      '2026-05-01': session('push_b', { db_incline_press: [{ reps: 10, weight: 50, rir: 2 }] }),
    }),
    recovery: baseRecovery({ chest: 0.84 }),
    fatigue: baseFatigue({ chest: 0.18 }),
    effectiveVolume,
    routine: gymRoutine,
    profile,
    fallbackSets: 3,
  });

  expect(progression[0].trend).toBe('productive_progress');
});

test('severe fatigue and recovery produce deload ahead of build-reps guidance', () => {
  const profile = getDefaultProfile();
  const effectiveVolume = [{ muscle: 'chest' as const, sets: 8, target: 16, minimum: 12, priorityRank: 2, status: 'low' as const }];
  const recovery = baseRecovery({ chest: 0.4 }, 0.42);
  const fatigue = baseFatigue({ chest: 0.78 }, { systemicFatigue: 0.82, jointRisk: 0.76, bottlenecks: ['systemic fatigue is high'] });
  const progression = getProgressionQuality({
    data: migrateWorkoutData({
      '2026-05-08': session('push_b', { db_incline_press: [{ reps: 6, weight: 60, rir: 1 }] }),
      '2026-05-01': session('push_b', { db_incline_press: [{ reps: 10, weight: 50, rir: 2 }] }),
    }),
    recovery,
    fatigue,
    effectiveVolume,
    routine: gymRoutine,
    profile,
    fallbackSets: 3,
  });
  const context = getAdaptiveRecommendations({ recovery, fatigue, progression, effectiveVolume, profile, today: new Date('2026-05-10T00:00:00') });

  expect(context.recommendations[0].action).toBe('deload');
  expect(context.recommendations[0].title).toBe('Deload First');
});

test('missing prescription falls back without crashing', () => {
  const progression = getProgressionQuality({
    data: migrateWorkoutData({
      '2026-05-08': session('push', { pushup: [{ reps: 16, weight: 0, rir: 2 }] }),
      '2026-05-01': session('push', { pushup: [{ reps: 12, weight: 0, rir: 2 }] }),
    }),
    recovery: baseRecovery({ chest: 0.84 }),
    fatigue: baseFatigue({ chest: 0.18 }),
    effectiveVolume: [{ muscle: 'chest', sets: 12, target: 16, minimum: 12, priorityRank: 2, status: 'productive' }],
    routine: gymRoutine,
    profile: getDefaultProfile(),
    fallbackSets: 3,
  });

  expect(progression[0].trend).toBe('improving');
  expect(progression[0].exerciseKey).toBe('pushup');
});

test('bodyweight reps-only entries classify without weight math', () => {
  const progression = getProgressionQuality({
    data: {
      '2026-05-08': session('delts_arms', { neck_iso_ext: [26, 26] }),
      '2026-05-01': session('delts_arms', { neck_iso_ext: [22, 22] }),
    },
    recovery: baseRecovery({ neck: 0.84 }),
    fatigue: baseFatigue({ neck: 0.18 }),
    effectiveVolume: [{ muscle: 'neck', sets: 4, target: 5, minimum: 2, priorityRank: 10, status: 'productive' }],
    routine: gymRoutine,
    profile: getDefaultProfile(),
    fallbackSets: 3,
  });

  expect(progression[0].trend).toBe('productive_progress');
  expect(progression[0].velocity).toBeGreaterThan(0);
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
