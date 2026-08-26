import { getChainsForRoutine, resolveExerciseKey } from './tiers';
import type { Exercise, RoutineConfig, UserProfile, WorkoutType } from './types';
import { EXERCISES } from './constants';
import { formatWorkoutType } from './schedule';

export const ROUTINE_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export interface RoutineDay {
  index: number;
  name: string;
  slug: string;
  workoutType: Exclude<WorkoutType, 'rest'>;
  label: string;
}

export function getRoutineDays(routine: RoutineConfig): RoutineDay[] {
  const weekdays = routine.trainingWeekdays ?? routine.schedule.map((_, index) => index);
  return routine.schedule.map((workoutType, index) => ({
    index: weekdays[index],
    name: ROUTINE_DAY_NAMES[weekdays[index]],
    slug: workoutType.replace(/_/g, '-'),
    workoutType,
    label: `${formatWorkoutType(workoutType)} ${index + 1}`,
  }));
}

export function getRoutineDay(slug: string, routine: RoutineConfig): RoutineDay | null {
  return getRoutineDays(routine).find((day) => day.slug === slug) ?? null;
}

export function getRoutineDayExercises(
  routine: RoutineConfig,
  day: RoutineDay,
  profile: UserProfile | null,
): { exercise: Exercise; chain: ReturnType<typeof getChainsForRoutine>[number] }[] {
  const tiers = profile?.tiers ?? {};
  return getChainsForRoutine(routine, day.workoutType)
    .map((chain) => {
      const exercise = EXERCISES.find((entry) => entry.key === resolveExerciseKey(chain, tiers));
      return exercise ? { exercise, chain } : null;
    })
    .filter((item): item is { exercise: Exercise; chain: ReturnType<typeof getChainsForRoutine>[number] } => Boolean(item));
}
