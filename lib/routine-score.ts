import { RoutineConfig, MuscleGroup, TierMap, ExerciseKey, WorkoutType } from './types';
import { EXERCISES } from './constants';
import { getExerciseMuscleContribution, scoreWeeklyVolume, RoutineScoreResult } from './smv';
import { EquipmentKey, getRequiredEquipment } from './equipment';
import { getChainsForWorkout, resolveExerciseKeyWithEquipment } from './tiers';

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

    for (const chain of getChainsForWorkout(wt, routine.id, occurrenceIndex)) {
      const key = resolveExerciseKeyWithEquipment(
        chain,
        options.tiers ?? {},
        options.unavailableEquipment ?? [],
        routine.id === 'gym'
      );
      const ex = EXERCISES.find((e) => e.key === key);
      if (!ex) continue;
      const contribution = getExerciseMuscleContribution(ex);

      for (const [muscle, multiplier] of Object.entries(contribution) as [MuscleGroup, number][]) {
        volume[muscle] = (volume[muscle] ?? 0) + setsPerExercise * multiplier;
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

    return getChainsForWorkout(wt, routine.id, occurrenceIndex).map((chain) =>
      resolveExerciseKeyWithEquipment(
        chain,
        options.tiers ?? {},
        options.unavailableEquipment ?? [],
        routine.id === 'gym'
      )
    );
  });

  const sessionSetCounts = resolvedBySession.map((keys) => keys.length * setsPerExercise);
  const equipmentChanges = resolvedBySession.reduce((sum, keys) => sum + getEquipmentChanges(keys), 0);
  const totalSets = sessionSetCounts.reduce((sum, sets) => sum + sets, 0);

  return scoreWeeklyVolume(getWeeklyVolume(routine, options), {
    totalSets,
    setsPerExercise,
    equipmentChanges,
    sessionSetCounts,
  });
}
