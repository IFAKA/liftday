'use client';

import { startOfWeek, addDays, isSameDay, format } from 'date-fns';
import { CheckCircle2, Circle, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWorkoutType } from '@/lib/schedule';
import { formatDateKey } from '@/lib/workout-utils';
import { WorkoutData, WorkoutType } from '@/lib/types';

interface WeeklySplitProps {
  currentDate: Date;
  data: WorkoutData;
}

const WORKOUT_TYPE_COLORS: Record<WorkoutType, string> = {
  push: 'text-orange-400',
  pull: 'text-blue-400',
  legs: 'text-green-400',
  rest: 'text-muted-foreground/40',
};

const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  push: 'PUSH',
  pull: 'PULL',
  legs: 'LEGS',
  rest: 'REST',
};

export function WeeklySplit({ currentDate, data }: WeeklySplitProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="w-full max-w-md mx-auto space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground/60 uppercase tracking-widest mb-3">
        <span>This Week</span>
        <Dumbbell className="w-3.5 h-3.5" />
      </div>

      <div className="space-y-1">
        {days.map((day, i) => {
          const workoutType = getWorkoutType(day);
          const dateKey = formatDateKey(day);
          const isCompleted = !!data[dateKey]?.logged_at;
          const isToday = isSameDay(day, currentDate);
          const dayName = format(day, 'EEE');
          const dayNumber = format(day, 'd');

          return (
            <div
              key={dateKey}
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg transition-colors',
                isToday && 'bg-muted/50',
                !isToday && 'opacity-60'
              )}
              style={{ animation: 'stagger-in 260ms ease-out backwards', animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center min-w-[3rem]">
                  <span className="text-xs text-muted-foreground uppercase">{dayName}</span>
                  <span className="text-sm font-mono">{dayNumber}</span>
                </div>

                <div className="flex flex-col">
                  <span
                    className={cn(
                      'text-sm font-medium uppercase tracking-wider',
                      WORKOUT_TYPE_COLORS[workoutType]
                    )}
                  >
                    {WORKOUT_TYPE_LABELS[workoutType]}
                  </span>
                  {workoutType !== 'rest' && (
                    <span className="text-xs text-muted-foreground/60">
                      4 exercises
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : workoutType !== 'rest' ? (
                  <Circle className="w-5 h-5 text-muted-foreground/30" />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
