import { getDay, addDays, startOfWeek, subDays } from 'date-fns';
import { WorkoutType } from './types';
import { formatDateKey, formatDisplayDate } from './workout-utils';

const DEFAULT_SCHEDULE: Exclude<WorkoutType, 'rest'>[] = ['push', 'pull', 'legs', 'push', 'pull', 'legs'];

/** Returns the workout type for a given date using the routine's schedule (or the default 6-day PPL). */
export function getWorkoutType(date: Date, schedule?: Exclude<WorkoutType, 'rest'>[]): WorkoutType {
  const day = getDay(date); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  if (day === 0) return 'rest'; // Sunday is always rest
  const cycle = schedule ?? DEFAULT_SCHEDULE;
  return cycle[(day - 1) % cycle.length];
}

export function isTrainingDay(date: Date): boolean {
  return getWorkoutType(date) !== 'rest';
}

export function nextTrainingDay(date: Date): Date {
  let d = addDays(date, 1);
  while (!isTrainingDay(d)) {
    d = addDays(d, 1);
  }
  return d;
}

export function getTrainingDaysCompletedThisWeek(
  date: Date,
  data: Record<string, { logged_at?: string }>
): { completed: number; total: number } {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  let completed = 0;
  const total = 6;

  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    const key = formatDateKey(d);
    if (data[key]?.logged_at) {
      completed++;
    }
  }

  return { completed, total };
}

export function getNextTrainingMessage(date: Date): string {
  const next = nextTrainingDay(date);
  const workoutType = getWorkoutType(next);
  return `${formatDisplayDate(next)} - ${workoutType.toUpperCase()}`;
}

export function getTrainingStreak(
  currentDate: Date,
  data: Record<string, { logged_at?: string }>
): number {
  let streak = 0;
  let checkDate = subDays(currentDate, 1);

  for (let i = 0; i < 365; i++) {
    if (!isTrainingDay(checkDate)) {
      checkDate = subDays(checkDate, 1);
      continue;
    }

    const key = formatDateKey(checkDate);
    if (data[key]?.logged_at) {
      streak++;
      checkDate = subDays(checkDate, 1);
    } else {
      break;
    }
  }

  return streak;
}
