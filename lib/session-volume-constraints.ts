import type { Exercise, UserProfile, WorkoutType } from './types';

export const UPPER_BODY_SESSION_MIN_SETS = 15;
export const LEGS_MAINTENANCE_SESSION_MIN_SETS = 12;
export const INCLUDED_DIRECT_ARM_MIN_SETS = 2;
export const INCLUDED_EXERCISE_MIN_SETS = 2;

const UPPER_BODY_WORKOUTS = new Set<WorkoutType>([
  'push_a',
  'pull_a',
  'push_b',
  'pull_b',
  'delts_arms',
  'push',
  'pull',
]);

export function isUpperBodyWorkout(workoutType: Exclude<WorkoutType, 'rest'>): boolean {
  return UPPER_BODY_WORKOUTS.has(workoutType);
}

export function getSessionHardSetFloor(workoutType: Exclude<WorkoutType, 'rest'>): number {
  if (workoutType === 'legs_maintenance' || workoutType === 'legs') return LEGS_MAINTENANCE_SESSION_MIN_SETS;
  return isUpperBodyWorkout(workoutType) ? UPPER_BODY_SESSION_MIN_SETS : 0;
}

export function isDirectArmExercise(exercise: Exercise): boolean {
  return exercise.primaryMuscle === 'biceps' || exercise.primaryMuscle === 'triceps';
}

export function hasExplicitInjuryMode(profile: UserProfile | null): boolean {
  const status = profile?.injuryStatus?.trim().toLowerCase();
  if (!status) return false;
  if (status.includes('no injuries') || status.includes('no injury') || status.includes('no pain')) return false;
  return status.includes('injury') || status.includes('injuries') || status.includes('pain') || status.includes('irritation');
}
