import { WorkoutData, ExerciseKey } from './types';
import { getPreviousSessionDate, getSetsForWeek } from './workout-utils';

const MIN_REPS = 6;
const MAX_REPS = 20;
const START_REPS = 8;

export function getTargets(
  exerciseKey: ExerciseKey,
  weekNumber: number,
  currentDate: Date,
  data: WorkoutData
): number[] {
  const sets = getSetsForWeek(weekNumber);
  const prevDateKey = getPreviousSessionDate(currentDate, data);

  if (!prevDateKey) return Array(sets).fill(START_REPS);

  const prevReps = data[prevDateKey]?.[exerciseKey];
  if (!prevReps || prevReps.length === 0) return Array(sets).fill(START_REPS);

  if (prevReps.every((r) => r >= MAX_REPS)) return Array(sets).fill(START_REPS);

  const avg = Math.floor(prevReps.reduce((sum, r) => sum + r, 0) / prevReps.length);
  return Array(sets).fill(Math.min(MAX_REPS, Math.max(MIN_REPS, avg + 1)));
}

export function shouldIncreaseDifficulty(exerciseKey: ExerciseKey, data: WorkoutData): boolean {
  for (const d of Object.keys(data).sort().reverse()) {
    const reps = data[d]?.[exerciseKey];
    if (reps && reps.length > 0) return reps.every((r) => r >= MAX_REPS);
  }
  return false;
}
