import { getDay, addDays, startOfWeek, subDays } from 'date-fns';
import { WorkoutType } from './types';
import { formatDateKey, formatDisplayDate } from './workout-utils';

const DEFAULT_SCHEDULE: Exclude<WorkoutType, 'rest'>[] = ['width_a', 'thickness_arms_a', 'legs_neck', 'width_b', 'thickness_arms_b'];
const WORKOUT_TYPE_TONES: Record<WorkoutType, string> = {
  width_a: 'text-orange-400',
  thickness_arms_a: 'text-blue-400',
  legs_neck: 'text-green-400',
  width_b: 'text-orange-300',
  thickness_arms_b: 'text-sky-300',
  push_a: 'text-orange-400',
  pull_a: 'text-blue-400',
  legs_maintenance: 'text-green-400',
  push_b: 'text-orange-300',
  pull_b: 'text-sky-300',
  delts_arms: 'text-pink-300',
  push: 'text-orange-400',
  pull: 'text-blue-400',
  legs: 'text-green-400',
  rest: 'text-white/20',
};

/** Returns the workout type for a given date using the routine's schedule (or the default 6-day PPL). */
export function getWorkoutType(date: Date, schedule?: Exclude<WorkoutType, 'rest'>[]): WorkoutType {
  const scheduleIndex = getWorkoutScheduleIndex(date, schedule);
  if (scheduleIndex === null) return 'rest';
  return (schedule ?? DEFAULT_SCHEDULE)[scheduleIndex];
}

export function getWorkoutScheduleIndex(
  date: Date,
  schedule?: Exclude<WorkoutType, 'rest'>[]
): number | null {
  const day = getDay(date); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  if (day === 0) return null; // Sunday is always rest
  const cycle = schedule ?? DEFAULT_SCHEDULE;
  const index = day - 1;
  return index >= cycle.length ? null : index;
}

export function getWorkoutOccurrenceIndex(
  date: Date,
  schedule?: Exclude<WorkoutType, 'rest'>[]
): number | null {
  const scheduleIndex = getWorkoutScheduleIndex(date, schedule);
  if (scheduleIndex === null) return null;

  const cycle = schedule ?? DEFAULT_SCHEDULE;
  const workoutType = cycle[scheduleIndex];
  return cycle.slice(0, scheduleIndex).filter((wt) => wt === workoutType).length;
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
  const total = 5;

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
  return `${formatDisplayDate(next)} - ${formatWorkoutType(workoutType)}`;
}

export function formatWorkoutType(workoutType: WorkoutType): string {
  switch (workoutType) {
    case 'width_a': return 'WIDTH A';
    case 'thickness_arms_a': return 'THICKNESS + ARMS A';
    case 'legs_neck': return 'LEGS + NECK';
    case 'width_b': return 'WIDTH B';
    case 'thickness_arms_b': return 'THICKNESS + ARMS B';
    case 'push_a': return 'PUSH A';
    case 'pull_a': return 'PULL A';
    case 'legs_maintenance': return 'LEGS';
    case 'push_b': return 'PUSH B';
    case 'pull_b': return 'PULL B';
    case 'delts_arms': return 'DELTS + ARMS';
    default: return workoutType.toUpperCase();
  }
}

export function getWorkoutTypeTone(workoutType: WorkoutType): string {
  return WORKOUT_TYPE_TONES[workoutType];
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
