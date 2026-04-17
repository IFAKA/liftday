import { TierMap, WorkoutType, ExerciseKey, TierChain } from './types';
import { ROUTINES } from './routines';

/** Returns the ordered list of chains for a given workout type and routine. */
export function getChainsForWorkout(
  wt: Exclude<WorkoutType, 'rest'>,
  routineId = 'calisthenics'
): TierChain[] {
  const routine = ROUTINES.find((r) => r.id === routineId) ?? ROUTINES[0];
  return routine.tierChains.filter((c) => c.workoutType === wt);
}

/**
 * Resolves the current exercise key for a chain given the user's tier map.
 * Clamps to valid range so the index is always safe.
 */
export function resolveExerciseKey(chain: TierChain, tiers: TierMap): ExerciseKey {
  const tier = tiers[chain.slotId] ?? 0;
  const clamped = Math.max(0, Math.min(tier, chain.exercises.length - 1));
  return chain.exercises[clamped];
}
