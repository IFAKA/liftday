'use client';

import { useEffect } from 'react';

import { startOfWeek, addDays, isSameDay, format } from 'date-fns';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWorkoutType } from '@/lib/schedule';
import { formatDateKey } from '@/lib/workout-utils';
import { WorkoutData, WorkoutType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TopBar } from './TopBar';

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
    <div className="flex flex-col h-full bg-black overflow-hidden relative pb-safe">
      <TopBar
        leftAction={
          <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2 text-white/50 hover:text-white hover:bg-transparent active:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        }
        center={
          <div className="flex flex-col items-center">
            <span className="text-fluid-ui font-black uppercase tracking-tight text-white leading-none">Schedule</span>
            <span className="text-fluid-label text-white/40 font-mono tracking-widest mt-0.5">THIS WEEK</span>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 no-scrollbar mt-2">
        <div className="flex flex-col gap-3">
          {days.map((day) => {
            const workoutType = getWorkoutType(day);
            const dateKey = formatDateKey(day);
            const isCompleted = !!data[dateKey]?.logged_at;
            const isToday = isSameDay(day, currentDate);
            const dayName = format(day, 'EEE');
            const dayNumber = format(day, 'd');

            return (
              <Card
                key={dateKey}
                className={cn(
                  'flex-row items-center justify-between px-6 py-6 gap-0 rounded-2xl transition-colors shadow-lg',
                  isToday ? 'bg-white/20 ring-2 ring-white/30 border-transparent' : 'bg-white/10 border-white/5',
                  isCompleted && 'opacity-30'
                )}
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-fluid-label text-white/60 uppercase tracking-widest font-black font-mono mb-2">
                    {dayName}, {dayNumber}
                  </span>
                  <span
                    className={cn(
                      'text-fluid-exercise font-black uppercase tracking-tight leading-none truncate',
                      WORKOUT_TYPE_COLORS[workoutType],
                      isCompleted && 'text-white/60'
                    )}
                  >
                    {WORKOUT_TYPE_LABELS[workoutType]}
                  </span>
                </div>
                
                <div className="flex flex-col items-end shrink-0 ml-4">
                  {isCompleted ? (
                    <span className="text-fluid-label font-black text-white/60 uppercase tracking-widest leading-none">DONE</span>
                  ) : (
                    <span className="text-fluid-exercise font-black tabular-nums text-white leading-none">--</span>
                  )}
                  {isToday && !isCompleted && workoutType !== 'rest' && (
                    <span className="text-fluid-label font-black text-white uppercase tracking-widest mt-2 bg-white/20 px-2 py-0.5 rounded animate-pulse">TODAY</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
