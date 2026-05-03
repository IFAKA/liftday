'use client';

import { startOfWeek, addDays, isSameDay, isBefore, format } from 'date-fns';
import { CheckCircle2, Circle, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWorkoutType } from '@/lib/schedule';
import { formatDateKey } from '@/lib/workout-utils';
import { WorkoutData, WorkoutType } from '@/lib/types';

interface WeeklySplitProps {
  currentDate: Date;
  data: WorkoutData;
  embedded?: boolean;
}

const WORKOUT_TYPE_COLORS: Record<WorkoutType, string> = {
  push: 'text-orange-400',
  pull: 'text-blue-400',
  legs: 'text-green-400',
  rest: 'text-white/20',
};

const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  push: 'PUSH',
  pull: 'PULL',
  legs: 'LEGS',
  rest: 'REST',
};

export function WeeklySplit({ currentDate, data, embedded = false }: WeeklySplitProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const firstVisibleDay = embedded ? currentDate : weekStart;
  const days = Array.from({ length: 7 }, (_, i) => addDays(firstVisibleDay, i));

  return (
    <div className={cn('flex flex-col bg-black', embedded ? '' : 'h-full overflow-hidden relative')}>
      <div className={cn(embedded ? '' : 'flex-1 overflow-y-auto px-3 pb-8 no-scrollbar mt-2')}>
        <div className={cn('flex flex-col overflow-hidden rounded-xl border border-white/5 bg-white/[0.03]', embedded ? '' : '')}>
          {days.map((day) => {
            const workoutType = getWorkoutType(day);
            const dateKey = formatDateKey(day);
            const isCompleted = !!data[dateKey]?.logged_at;
            const isToday = isSameDay(day, currentDate);
            const isPast = !isToday && isBefore(day, currentDate);
            const isMissed = isPast && !isCompleted && workoutType !== 'rest';
            const dayName = format(day, 'EEE');
            const dayNumber = format(day, 'd');

            return (
              <div
                key={dateKey}
                className={cn(
                  'flex min-h-14 items-center justify-between gap-3 border-b border-white/5 px-4 py-3 transition-colors last:border-b-0',
                  isToday && 'bg-white/10',
                )}
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[11px] leading-none text-white/45 uppercase font-black font-mono">
                    {dayName}, {dayNumber}
                  </span>
                  <span
                    className={cn(
                      'mt-1 text-fluid-ui font-black uppercase leading-none truncate',
                      WORKOUT_TYPE_COLORS[workoutType],
                    )}
                  >
                    {WORKOUT_TYPE_LABELS[workoutType]}
                  </span>
                </div>

                <div className="flex h-8 w-8 items-center justify-center shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : workoutType === 'rest' ? (
                    <Minus className="w-4 h-4 text-white/20" />
                  ) : isMissed ? (
                    <Circle className="w-5 h-5 text-white/20" />
                  ) : isToday ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-white" aria-label="Today" />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
