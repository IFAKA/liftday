import { TierMap, WorkoutType, ExerciseKey, TierChain } from './types';
import { ROUTINES } from './routines';
import { EquipmentKey, canPerformExercise, getRequiredEquipment } from './equipment';
import { EXERCISES } from './constants';
import { getExerciseSMVScore } from './smv';

/** Returns the ordered list of chains for a given workout type and routine. */
export function getChainsForWorkout(
  wt: Exclude<WorkoutType, 'rest'>,
  routineId = 'calisthenics',
  occurrenceIndex?: number
): TierChain[] {
  const routine = ROUTINES.find((r) => r.id === routineId) ?? ROUTINES[0];
  return routine.tierChains.filter((c) => (
    c.workoutType === wt && isChainActiveForOccurrence(c, occurrenceIndex)
  ));
}

function isChainActiveForOccurrence(chain: TierChain, occurrenceIndex?: number): boolean {
  if (!chain.cadence || occurrenceIndex === undefined) return true;
  return chain.cadence === 'first' ? occurrenceIndex % 2 === 0 : occurrenceIndex % 2 === 1;
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

// Equipment that counts as "non-gym" — excluded from alternatives when gymOnly is true
const NON_GYM_EQUIPMENT = new Set<EquipmentKey>(['none', 'pullup_bar', 'dip_bars', 'trx']);

/**
 * Like resolveExerciseKey but skips exercises that need unavailable equipment.
 * Prefers higher tiers (harder variants) when looking for fallbacks.
 * Returns the base key unchanged if no suitable alternative exists in the chain.
 * When gymOnly is true, bodyweight/bar/TRX alternatives are ignored.
 */
export function resolveExerciseKeyWithEquipment(
  chain: TierChain,
  tiers: TierMap,
  unavailable: EquipmentKey[],
  gymOnly = false,
): ExerciseKey {
  const baseKey = resolveExerciseKey(chain, tiers);
  if (unavailable.length === 0) return baseKey;
  if (canPerformExercise(baseKey, unavailable)) return baseKey;

  // Pick the available exercise with the highest SMV score
  let available = chain.exercises.filter((key) => canPerformExercise(key, unavailable));
  if (gymOnly) {
    const gymOnly = available.filter((key) =>
      getRequiredEquipment(key).some((eq) => !NON_GYM_EQUIPMENT.has(eq))
    );
    if (gymOnly.length > 0) available = gymOnly;
  }
  if (available.length === 0) return baseKey;

  return available.reduce((best, key) => {
    const ex = EXERCISES.find((e) => e.key === key);
    const bestEx = EXERCISES.find((e) => e.key === best);
    if (!ex) return best;
    if (!bestEx) return key;
    return getExerciseSMVScore(ex) >= getExerciseSMVScore(bestEx) ? key : best;
  }, available[0]);
}
