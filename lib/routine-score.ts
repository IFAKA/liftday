import { RoutineConfig, MuscleGroup, TierMap, ExerciseKey, WorkoutType } from './types';
import { EXERCISES } from './constants';
import { getExerciseMuscleContribution, scoreWeeklyVolume, RoutineScoreResult } from './smv';
import { EquipmentKey, getRequiredEquipment } from './equipment';
import { getChainsForRoutine, resolveExerciseKeyWithEquipment } from './tiers';
import { getChainSetCount } from './routine-plan';

export interface RoutineScoreOptions {
  tiers?: TierMap;
  setsPerExercise?: number;
  unavailableEquipment?: EquipmentKey[];
}

function getStationKey(exerciseKey: ExerciseKey): string {
  const required = getRequiredEquipment(exerciseKey).filter((eq) => eq !== 'none');
  if (required.length === 0) return 'bodyweight';
  return [...required].sort().join('+');
}

function getEquipmentChanges(exerciseKeys: ExerciseKey[]): number {
  let changes = 0;
  let previous: string | null = null;

  for (const key of exerciseKeys) {
    const station = getStationKey(key);
    if (previous !== null && station !== previous) changes++;
    previous = station;
  }

  return changes;
}

export function getWeeklyVolume(
  routine: RoutineConfig,
  options: RoutineScoreOptions = {}
): Partial<Record<MuscleGroup, number>> {
  const setsPerExercise = options.setsPerExercise ?? 3;
  const volume: Partial<Record<MuscleGroup, number>> = {};

  const occurrences: Partial<Record<Exclude<WorkoutType, 'rest'>, number>> = {};
  for (const wt of routine.schedule) {
    const occurrenceIndex = occurrences[wt] ?? 0;
    occurrences[wt] = occurrenceIndex + 1;

    for (const chain of getChainsForRoutine(routine, wt, occurrenceIndex)) {
      const key = resolveExerciseKeyWithEquipment(
        chain,
        options.tiers ?? {},
        options.unavailableEquipment ?? [],
        routine.id === 'gym'
      );
      const ex = EXERCISES.find((e) => e.key === key);
      if (!ex) continue;
      const contribution = getExerciseMuscleContribution(ex);

      const chainSets = getChainSetCount(chain, setsPerExercise);
      for (const [muscle, multiplier] of Object.entries(contribution) as [MuscleGroup, number][]) {
        volume[muscle] = (volume[muscle] ?? 0) + chainSets * multiplier;
      }
    }
  }

  return volume;
}

export function scoreRoutine(
  routine: RoutineConfig,
  options: RoutineScoreOptions = {}
): RoutineScoreResult {
  const setsPerExercise = options.setsPerExercise ?? 3;
  const occurrences: Partial<Record<Exclude<WorkoutType, 'rest'>, number>> = {};
  const resolvedBySession = routine.schedule.map((wt) => {
    const occurrenceIndex = occurrences[wt] ?? 0;
    occurrences[wt] = occurrenceIndex + 1;

    return getChainsForRoutine(routine, wt, occurrenceIndex).map((chain) => ({
      key: resolveExerciseKeyWithEquipment(
        chain,
        options.tiers ?? {},
        options.unavailableEquipment ?? [],
        routine.id === 'gym'
      ),
      sets: getChainSetCount(chain, setsPerExercise),
    }));
  });

  const sessionSetCounts = resolvedBySession.map((items) => items.reduce((sum, item) => sum + item.sets, 0));
  const equipmentChanges = resolvedBySession.reduce((sum, items) => sum + getEquipmentChanges(items.map((item) => item.key)), 0);
  const totalSets = sessionSetCounts.reduce((sum, sets) => sum + sets, 0);

  return scoreWeeklyVolume(getWeeklyVolume(routine, options), {
    totalSets,
    setsPerExercise,
    equipmentChanges,
    sessionSetCounts,
  });
}
