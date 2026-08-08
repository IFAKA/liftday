import { getChainsForRoutine, resolveExerciseKey } from './tiers';
import { getRoutine } from './routines';
import type { Exercise, RoutineConfig, UserProfile, WorkoutType } from './types';
import { EXERCISES } from './constants';
import { formatWorkoutType } from './schedule';

export const ROUTINE_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;

export interface RoutineDay {
  index: number;
  name: string;
  slug: string;
  workoutType: Exclude<WorkoutType, 'rest'>;
  label: string;
}

export function getRoutineDays(routine: RoutineConfig = getRoutine('gym')): RoutineDay[] {
  return routine.schedule.slice(0, 5).map((workoutType, index) => ({
    index,
    name: ROUTINE_DAY_NAMES[index],
    slug: workoutType.replace(/_/g, '-'),
    workoutType,
    label: formatWorkoutType(workoutType),
  }));
}

export function getRoutineDay(slug: string, routine: RoutineConfig = getRoutine('gym')): RoutineDay | null {
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
