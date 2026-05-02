'use client';

import { startOfWeek, addDays, isSameDay, isBefore, format } from 'date-fns';
import { CheckCircle2, Circle, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWorkoutType } from '@/lib/schedule';
import { formatDateKey } from '@/lib/workout-utils';
import { WorkoutData, WorkoutType } from '@/lib/types';
import { WatchPanel } from '@/components/WatchSurface';

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
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className={cn('flex flex-col bg-black', embedded ? '' : 'h-full overflow-hidden relative')}>
      <div className={cn(embedded ? '' : 'flex-1 overflow-y-auto px-4 pb-8 no-scrollbar mt-2')}>
        <div className={cn('flex flex-col', embedded ? 'gap-2' : 'gap-3')}>
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
              <WatchPanel
                key={dateKey}
                className={cn(
                  'flex items-center justify-between gap-4 transition-colors',
                  embedded ? 'px-4 py-4' : 'px-5 py-5',
                )}
                active={isToday}
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-fluid-label text-white/60 uppercase font-black font-mono mb-2">
                    {dayName}, {dayNumber}
                  </span>
                  <span
                    className={cn(
                      'text-fluid-exercise font-black uppercase leading-none truncate',
                      WORKOUT_TYPE_COLORS[workoutType],
                    )}
                  >
                    {WORKOUT_TYPE_LABELS[workoutType]}
                  </span>
                </div>

                <div className="flex flex-col items-center shrink-0 ml-4">
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : workoutType === 'rest' ? (
                    <Minus className="w-5 h-5 text-white/20" />
                  ) : isMissed ? (
                    <Circle className="w-6 h-6 text-white/20" />
                  ) : isToday ? (
                    <span className="text-fluid-label font-black text-white uppercase bg-white/15 px-2 py-0.5 rounded animate-pulse">TODAY</span>
                  ) : null}
                </div>
              </WatchPanel>
            );
          })}
        </div>
      </div>
    </div>
  );
}
