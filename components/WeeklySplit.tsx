'use client';

import { startOfWeek, addDays, isSameDay, format } from 'date-fns';
import { Dumbbell } from 'lucide-react';
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
  rest: 'text-white/20',
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
    <div className="w-full flex flex-col space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white/50">
          This Week
        </span>
        <Dumbbell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/30" />
      </div>

      <div className="flex flex-col gap-2">
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
                'flex items-center justify-between px-4 py-3 rounded-2xl transition-colors',
                isToday ? 'bg-white/10 ring-1 ring-white/20' : 'bg-[#1A1A1A]',
                isCompleted && 'opacity-50' // Dim days already done
              )}
              style={{ animation: 'stagger-in 260ms ease-out backwards', animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center justify-center w-8 sm:w-10">
                  <span className="text-[8px] sm:text-[10px] text-white/50 uppercase tracking-widest">{dayName}</span>
                  <span className="text-lg sm:text-xl font-black tabular-nums text-white leading-none mt-0.5">{dayNumber}</span>
                </div>

                <div className="flex flex-col justify-center border-l border-white/10 pl-3 sm:pl-4 h-8 sm:h-10">
                  <span
                    className={cn(
                      'text-base sm:text-lg font-black uppercase tracking-tight leading-none',
                      WORKOUT_TYPE_COLORS[workoutType],
                      isCompleted && 'text-white/40' // Override color if done
                    )}
                  >
                    {WORKOUT_TYPE_LABELS[workoutType]}
                  </span>
                  {isCompleted && (
                    <span className="text-[8px] sm:text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5 sm:mt-1">
                      COMPLETED
                    </span>
                  )}
                  {isToday && !isCompleted && workoutType !== 'rest' && (
                    <span className="text-[8px] sm:text-[10px] font-bold text-white uppercase tracking-widest mt-0.5 sm:mt-1 animate-pulse">
                      YOUR TURN
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
