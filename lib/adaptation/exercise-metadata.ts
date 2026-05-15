import { EXERCISES } from '../constants';
import { EXERCISE_MUSCLE_CONTRIBUTIONS, MUSCLE_MIN_WEEKLY_SETS, MUSCLE_SMV_SCORE, MUSCLE_TARGET_WEEKLY_SETS } from '../smv';
import type {
  ExerciseAdaptationMetadata,
  ExerciseKey,
  JointArea,
  MuscleGroup,
  MusclePriorityProfile,
} from '../types';

export const MUSCLE_PRIORITY_PROFILES: MusclePriorityProfile[] = [
  profile('side_delt', 'lateral_delts', 1, 'Side delts', 14, 12, 18),
  profile('chest', 'upper_chest_chest', 2, 'Chest', 16, 12, 24),
  profile('lats', 'lats', 3, 'Lats', 16, 12, 26),
  profile('rear_delt', 'rear_delts_posture', 4, 'Rear delts', 18, 12, 18),
  profile('upper_back', 'rear_delts_posture', 5, 'Posture', 8, 4, 28),
  profile('biceps', 'biceps', 6, 'Biceps', 14, 10, 20),
  profile('triceps', 'triceps', 7, 'Triceps', 14, 10, 22),
  profile('shoulders', 'lateral_delts', 8, 'Pressing delts', 8, 4, 24),
  profile('mid_back', 'rear_delts_posture', 9, 'Mid back', 8, 4, 30),
  profile('neck', 'neck_traps_forearms', 10, 'Neck/traps', 5, 2, 20),
  profile('glutes', 'legs_maintenance', 11, 'Glutes', 6, 4, 32, true),
  profile('quads', 'legs_maintenance', 12, 'Quads', 7, 6, 34, true),
  profile('hamstrings', 'legs_maintenance', 13, 'Hamstrings', 6, 4, 36, true),
  profile('calves', 'legs_maintenance', 14, 'Calves', 8, 2, 22, true),
];

export const MUSCLE_PRIORITY_BY_MUSCLE = Object.fromEntries(
  MUSCLE_PRIORITY_PROFILES.map((entry) => [entry.muscle, entry])
) as Record<MuscleGroup, MusclePriorityProfile>;

export const EXERCISE_ADAPTATION_METADATA = Object.fromEntries(
  EXERCISES.map((exercise) => [exercise.key, buildMetadata(exercise.key)])
) as Record<ExerciseKey, ExerciseAdaptationMetadata>;

export function getExerciseAdaptationMetadata(exerciseKey: ExerciseKey): ExerciseAdaptationMetadata {
  return EXERCISE_ADAPTATION_METADATA[exerciseKey];
}

function profile(
  muscle: MuscleGroup,
  priority: MusclePriorityProfile['priority'],
  rank: number,
  label: string,
  targetWeeklySets: number,
  minimumWeeklySets: number,
  recoveryHalfLifeHours: number,
  maintenanceOnly = false
): MusclePriorityProfile {
  return {
    muscle,
    priority,
    rank,
    label,
    targetWeeklySets: MUSCLE_TARGET_WEEKLY_SETS[muscle] ?? targetWeeklySets,
    minimumWeeklySets: MUSCLE_MIN_WEEKLY_SETS[muscle] ?? minimumWeeklySets,
    smvContribution: MUSCLE_SMV_SCORE[muscle] ?? 1,
    recoveryHalfLifeHours,
    maintenanceOnly,
  };
}

function buildMetadata(exerciseKey: ExerciseKey): ExerciseAdaptationMetadata {
  const contribution = EXERCISE_MUSCLE_CONTRIBUTIONS[exerciseKey] ?? {};
  const primaryMuscles = Object.entries(contribution)
    .filter(([, value]) => value >= 0.8)
    .map(([muscle]) => muscle as MuscleGroup);
  const allMuscles = Object.keys(contribution) as MuscleGroup[];
  const fallbackPrimary = EXERCISES.find((exercise) => exercise.key === exerciseKey)?.primaryMuscle;
  const primary = primaryMuscles.length > 0 ? primaryMuscles : fallbackPrimary ? [fallbackPrimary] : [];
  const secondaryMuscles = Object.fromEntries(
    Object.entries(contribution).filter(([, value]) => value < 0.8)
  ) as Partial<Record<MuscleGroup, number>>;
  const axialFatigue = getAxialFatigue(exerciseKey);
  const systemicFatigue = getSystemicFatigue(exerciseKey, allMuscles.length);
  const localDamage = getLocalDamage(exerciseKey);
  const stabilityDemand = getStabilityDemand(exerciseKey);
  const progressionReliability = getProgressionReliability(exerciseKey);
  const clothedSmvContribution = allMuscles.reduce(
    (sum, muscle) => sum + (contribution[muscle] ?? 0) * (MUSCLE_SMV_SCORE[muscle] ?? 1),
    0
  );

  return {
    exerciseKey,
    primaryMuscles: primary,
    secondaryMuscles,
    indirectVolume: contribution,
    axialFatigue,
    systemicFatigue,
    localDamage,
    stabilityDemand,
    progressionReliability,
    stretchBias: getStretchBias(exerciseKey),
    shortenedBias: getShortenedBias(exerciseKey),
    clothedSmvContribution,
    jointStress: getJointStress(exerciseKey, axialFatigue),
  };
}

function hasAny(key: ExerciseKey, fragments: string[]): boolean {
  return fragments.some((fragment) => key.includes(fragment));
}

function getAxialFatigue(key: ExerciseKey): number {
  if (hasAny(key, ['deadlift', 'barbell_squat', 'front_squat'])) return 0.95;
  if (hasAny(key, ['barbell_row', 'romanian_deadlift', 'smith_squat'])) return 0.75;
  if (hasAny(key, ['goblet_squat', 'bulgarian', 'pistol'])) return 0.45;
  if (hasAny(key, ['leg_press', 'hack_squat', 'smith_incline'])) return 0.25;
  return 0.08;
}

function getSystemicFatigue(key: ExerciseKey, muscles: number): number {
  if (hasAny(key, ['deadlift', 'squat', 'leg_press', 'pullup', 'dip'])) return 0.8;
  if (hasAny(key, ['press', 'row', 'pulldown', 'bulgarian', 'romanian'])) return 0.55;
  return Math.min(0.35, 0.12 + muscles * 0.06);
}

function getLocalDamage(key: ExerciseKey): number {
  if (hasAny(key, ['nordic', 'romanian_deadlift', 'deadlift', 'incline_curl'])) return 0.85;
  if (hasAny(key, ['fly', 'pulldown', 'overhead_tricep', 'bulgarian'])) return 0.65;
  if (hasAny(key, ['lateral_raise', 'rear_delt', 'face_pull', 'cable_curl'])) return 0.35;
  return 0.5;
}

function getStabilityDemand(key: ExerciseKey): number {
  if (hasAny(key, ['trx', 'pistol', 'bulgarian'])) return 0.75;
  if (hasAny(key, ['barbell', 'db_', 'goblet'])) return 0.5;
  if (hasAny(key, ['machine', 'smith', 'cable', 'pec_deck'])) return 0.2;
  return 0.35;
}

function getProgressionReliability(key: ExerciseKey): number {
  if (hasAny(key, ['machine', 'smith', 'cable', 'leg_press', 'pulldown'])) return 0.9;
  if (hasAny(key, ['db_', 'barbell', 'goblet'])) return 0.75;
  if (hasAny(key, ['trx', 'pushup', 'pistol'])) return 0.55;
  return 0.7;
}

function getStretchBias(key: ExerciseKey): number {
  if (hasAny(key, ['incline', 'fly', 'romanian', 'pulldown', 'overhead_tricep', 'nordic'])) return 0.8;
  if (hasAny(key, ['row', 'squat', 'curl'])) return 0.55;
  return 0.35;
}

function getShortenedBias(key: ExerciseKey): number {
  if (hasAny(key, ['lateral_raise', 'pushdown', 'kickback', 'leg_extension', 'calf_raise'])) return 0.8;
  if (hasAny(key, ['row', 'press', 'curl'])) return 0.55;
  return 0.35;
}

function getJointStress(key: ExerciseKey, axialFatigue: number): Partial<Record<JointArea, number>> {
  const stress: Partial<Record<JointArea, number>> = {};
  if (hasAny(key, ['press', 'pushup', 'dip', 'fly', 'lateral_raise', 'upright_row'])) stress.shoulder = 0.45;
  if (hasAny(key, ['tricep', 'dip', 'pushup', 'curl'])) stress.elbow = 0.45;
  if (hasAny(key, ['squat', 'leg_press', 'leg_extension', 'pistol', 'bulgarian'])) stress.knee = 0.45;
  if (hasAny(key, ['deadlift', 'row', 'squat'])) stress.spine = Math.max(0.4, axialFatigue);
  if (hasAny(key, ['calf_raise'])) stress.ankle = 0.35;
  if (hasAny(key, ['hip_thrust', 'glute', 'deadlift'])) stress.hip = 0.35;
  return stress;
}
