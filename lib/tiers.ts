import { TierMap, WorkoutType, ExerciseKey, TierChain } from './types';
import { ROUTINES } from './routines';
import { EquipmentKey, canPerformExercise } from './equipment';
import { EXERCISES } from './constants';
import { getExerciseSMVScore } from './smv';

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

/**
 * Like resolveExerciseKey but skips exercises that need unavailable equipment.
 * Prefers higher tiers (harder variants) when looking for fallbacks.
 * Returns the base key unchanged if no suitable alternative exists in the chain.
 */
export function resolveExerciseKeyWithEquipment(
  chain: TierChain,
  tiers: TierMap,
  unavailable: EquipmentKey[]
): ExerciseKey {
  const baseKey = resolveExerciseKey(chain, tiers);
  if (unavailable.length === 0) return baseKey;
  if (canPerformExercise(baseKey, unavailable)) return baseKey;

  // Pick the available exercise with the highest SMV score
  const available = chain.exercises.filter((key) => canPerformExercise(key, unavailable));
  if (available.length === 0) return baseKey;

  return available.reduce((best, key) => {
    const ex = EXERCISES.find((e) => e.key === key);
    const bestEx = EXERCISES.find((e) => e.key === best);
    if (!ex) return best;
    if (!bestEx) return key;
    return getExerciseSMVScore(ex) >= getExerciseSMVScore(bestEx) ? key : best;
  }, available[0]);
}
