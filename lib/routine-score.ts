import { RoutineConfig, MuscleGroup, TierMap, ExerciseKey } from './types';
import { EXERCISES } from './constants';
import { getExerciseMuscleContribution, scoreWeeklyVolume, RoutineScoreResult } from './smv';
import { EquipmentKey, getRequiredEquipment } from './equipment';
import { resolveExerciseKeyWithEquipment } from './tiers';

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
  const sessionsPerType: Record<string, number> = {};
  for (const wt of routine.schedule) {
    sessionsPerType[wt] = (sessionsPerType[wt] ?? 0) + 1;
  }

  const setsPerExercise = options.setsPerExercise ?? 3;
  const volume: Partial<Record<MuscleGroup, number>> = {};
  for (const chain of routine.tierChains) {
    const key = resolveExerciseKeyWithEquipment(
      chain,
      options.tiers ?? {},
      options.unavailableEquipment ?? [],
      routine.id === 'gym'
    );
    const ex = EXERCISES.find((e) => e.key === key);
    if (!ex) continue;
    const sessions = sessionsPerType[chain.workoutType] ?? 0;
    const sets = sessions * setsPerExercise;
    const contribution = getExerciseMuscleContribution(ex);

    for (const [muscle, multiplier] of Object.entries(contribution) as [MuscleGroup, number][]) {
      volume[muscle] = (volume[muscle] ?? 0) + sets * multiplier;
    }
  }

  return volume;
}

export function scoreRoutine(
  routine: RoutineConfig,
  options: RoutineScoreOptions = {}
): RoutineScoreResult {
  const setsPerExercise = options.setsPerExercise ?? 3;
  const resolvedByWorkout: Record<string, ExerciseKey[]> = {};

  for (const wt of routine.schedule) {
    if (!resolvedByWorkout[wt]) {
      resolvedByWorkout[wt] = routine.tierChains
        .filter((chain) => chain.workoutType === wt)
        .map((chain) =>
          resolveExerciseKeyWithEquipment(
            chain,
            options.tiers ?? {},
            options.unavailableEquipment ?? [],
            routine.id === 'gym'
          )
        );
    }
  }

  const sessionSetCounts = routine.schedule.map((wt) => (resolvedByWorkout[wt]?.length ?? 0) * setsPerExercise);
  const equipmentChanges = routine.schedule.reduce(
    (sum, wt) => sum + getEquipmentChanges(resolvedByWorkout[wt] ?? []),
    0
  );
  const totalSets = sessionSetCounts.reduce((sum, sets) => sum + sets, 0);

  return scoreWeeklyVolume(getWeeklyVolume(routine, options), {
    totalSets,
    setsPerExercise,
    equipmentChanges,
    sessionSetCounts,
  });
}
