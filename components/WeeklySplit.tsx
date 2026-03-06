'use client';

import { useEffect } from 'react';

import { startOfWeek, addDays, isSameDay, format } from 'date-fns';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWorkoutType } from '@/lib/schedule';
import { formatDateKey } from '@/lib/workout-utils';
import { WorkoutData, WorkoutType } from '@/lib/types';

interface WeeklySplitProps {
  currentDate: Date;
  data: WorkoutData;
  onBack: () => void;
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

export function WeeklySplit({ currentDate, data, onBack }: WeeklySplitProps) {
  useEffect(() => {
    const handlePopState = () => {
      onBack();
      window.history.pushState({ split: true }, '');
    };
    window.history.pushState({ split: true }, '');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onBack]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex flex-col h-[100dvh] bg-black p-safe overflow-hidden relative">
      <div
        className="flex items-center gap-2 sm:gap-4 px-2 sm:px-4 pt-2 sm:pt-4 pb-2 shrink-0 z-10 bg-black"
        style={{ animation: 'slide-down-in 260ms ease-out backwards' }}
      >
        <button
          onClick={onBack}
          className="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center -ml-1 sm:-ml-3 rounded-full active:bg-white/10 text-white transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>
        <div className="flex flex-col">
          <h1 className="text-base sm:text-xl font-bold tracking-tight uppercase text-white leading-none">Schedule</h1>
          <span className="text-[8px] sm:text-[10px] text-white/50 font-mono tracking-widest mt-0.5">
            THIS WEEK
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 no-scrollbar mask-fade-edges mt-4">
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
    </div>
  );
}
