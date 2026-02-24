import { format, endOfWeek, eachDayOfInterval, differenceInWeeks } from 'date-fns';
import { WorkoutData, ComparisonResult, WeeklyStats, ExerciseKey } from './types';

export function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatDisplayDate(date: Date): string {
  return format(date, 'EEEE d MMM').toUpperCase();
}

export function getWeekNumber(firstSessionDate: string | null, currentDate: Date): number {
  if (!firstSessionDate) return 1;
  const first = new Date(firstSessionDate);
  const weeks = differenceInWeeks(currentDate, first);
  return Math.max(1, weeks + 1);
}

export function getSetsForWeek(weekNumber: number): number {
  return weekNumber <= 4 ? 2 : 3;
}

export function getPreviousSessionDate(
  currentDate: Date,
  data: WorkoutData
): string | null {
  const currentKey = formatDateKey(currentDate);
  const dates = Object.keys(data)
    .filter((d) => d < currentKey && data[d].logged_at)
    .sort()
    .reverse();
  return dates[0] || null;
}

export function compareReps(
  current: number,
  previous: number | null
): ComparisonResult {
  if (previous === null) return { status: 'none', previousValue: null };
  if (current > previous) return { status: 'improved', previousValue: previous };
  if (current < previous) return { status: 'decreased', previousValue: previous };
  return { status: 'same', previousValue: previous };
}

export function getWeeklyStats(
  data: WorkoutData,
  weekStart: Date
): WeeklyStats {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  let sessionsCompleted = 0;
  let totalSets = 0;

  for (const day of days) {
    const key = formatDateKey(day);
    const session = data[key];
    if (session?.logged_at) {
      sessionsCompleted++;
      for (const k of Object.keys(session)) {
        if (k !== 'logged_at' && k !== 'week_number') {
          const val = session[k as ExerciseKey];
          if (Array.isArray(val)) {
            totalSets += val.length;
          }
        }
      }
    }
  }

  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekEnd = endOfWeek(prevWeekStart, { weekStartsOn: 1 });
  const prevDays = eachDayOfInterval({ start: prevWeekStart, end: prevWeekEnd });

  let prevSessions = 0;
  for (const day of prevDays) {
    const key = formatDateKey(day);
    if (data[key]?.logged_at) prevSessions++;
  }

  return {
    sessionsCompleted,
    totalSets,
    vsLastWeek: prevSessions > 0 ? sessionsCompleted - prevSessions : null,
  };
}
