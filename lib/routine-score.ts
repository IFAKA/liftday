import { RoutineConfig, MuscleGroup } from './types';
import { EXERCISES } from './constants';
import { scoreWeeklyVolume, RoutineScoreResult } from './smv';

const SETS_PER_SLOT = 3;

export function getWeeklyVolume(routine: RoutineConfig): Partial<Record<MuscleGroup, number>> {
  const sessionsPerType: Record<string, number> = {};
  for (const wt of routine.schedule) {
    sessionsPerType[wt] = (sessionsPerType[wt] ?? 0) + 1;
  }

  const volume: Partial<Record<MuscleGroup, number>> = {};
  for (const chain of routine.tierChains) {
    const ex = EXERCISES.find((e) => e.key === chain.exercises[0]);
    if (!ex) continue;
    const sessions = sessionsPerType[chain.workoutType] ?? 0;
    volume[ex.primaryMuscle] = (volume[ex.primaryMuscle] ?? 0) + sessions * SETS_PER_SLOT;
  }

  return volume;
}

export function scoreRoutine(routine: RoutineConfig): RoutineScoreResult {
  return scoreWeeklyVolume(getWeeklyVolume(routine));
}
