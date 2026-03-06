'use client';

import { useMemo, useEffect } from 'react';
import { ChevronLeft, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { WorkoutData, WorkoutType } from '@/lib/types';
import { PUSH_EXERCISES, PULL_EXERCISES, LEGS_EXERCISES, EXERCISES } from '@/lib/constants';

interface HistoryScreenProps {
  data: WorkoutData;
  currentDate: Date;
  onBack: () => void;
}

const TYPE_COLOR: Record<Exclude<WorkoutType, 'rest'>, string> = {
  push: 'text-orange-400',
  pull: 'text-blue-400',
  legs: 'text-green-400',
};

export function HistoryScreen({ data, onBack }: HistoryScreenProps) {
  useEffect(() => {
    const handlePopState = () => {
      onBack();
      window.history.pushState({ history: true }, '');
    };
    window.history.pushState({ history: true }, '');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onBack]);

  const totalSessions = useMemo(
    () => Object.values(data).filter((s) => s.logged_at).length,
    [data]
  );

  const recentSessions = useMemo(() => {
    return Object.entries(data)
      .filter(([, s]) => s.logged_at)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 15);
  }, [data]);

  const prs = useMemo(() => {
    const result: Record<string, number> = {};
    for (const session of Object.values(data)) {
      if (!session.logged_at) continue;
      for (const ex of EXERCISES) {
        const reps = session[ex.key];
        if (reps && reps.length > 0) {
          const best = Math.max(...reps);
          if (!result[ex.key] || best > result[ex.key]) result[ex.key] = best;
        }
      }
    }
    return result;
  }, [data]);

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
          <h1 className="text-base sm:text-xl font-bold tracking-tight uppercase text-white leading-none">History</h1>
          <span className="text-[8px] sm:text-[10px] text-white/50 font-mono tracking-widest mt-0.5">
            {totalSessions} SESSIONS
          </span>
        </div>
      </div>

      {totalSessions === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-white/40 text-sm uppercase tracking-widest font-bold">No sessions yet.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pb-8 no-scrollbar mask-fade-edges mt-4">
          
          {/* Personal Records - High Contrast Blocks */}
          {Object.keys(prs).length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3 px-1">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                  Best Sets
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {EXERCISES.filter((ex) => prs[ex.key]).map((ex, i) => (
                  <div
                    key={ex.key}
                    className="rounded-xl sm:rounded-2xl p-3 sm:p-4 bg-[#1A1A1A] flex flex-col justify-between aspect-square"
                    style={{ animation: 'stagger-in 260ms ease-out backwards', animationDelay: `${i * 40}ms` }}
                  >
                    <p className="text-[10px] sm:text-xs font-bold text-white/60 leading-tight uppercase tracking-wide">
                      {ex.name}
                    </p>
                    <div className="mt-auto">
                      <p className="text-2xl sm:text-4xl font-black tabular-nums tracking-tighter text-white">
                        {prs[ex.key]}
                      </p>
                      <p className="text-[8px] sm:text-[10px] font-mono text-white/30 uppercase tracking-widest">
                        {ex.unit === 'seconds' ? 'Seconds' : 'Reps'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent sessions */}
          {recentSessions.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 px-1">
                Recent Workouts
              </p>
              <div className="flex flex-col gap-3">
                {recentSessions.map(([dateKey, session], i) => {
                  const wt = session.workout_type;
                  const exercises =
                    wt === 'push' ? PUSH_EXERCISES : wt === 'pull' ? PULL_EXERCISES : LEGS_EXERCISES;
                  
                  const totalReps = exercises.reduce((sum, ex) => {
                    const reps = session[ex.key];
                    return sum + (reps ? reps.reduce((s, r) => s + r, 0) : 0);
                  }, 0);
                  
                  const displayDate = new Date(dateKey + 'T12:00:00');

                  return (
                    <div
                      key={dateKey}
                      className="flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#1A1A1A]"
                      style={{ animation: 'stagger-in 260ms ease-out backwards', animationDelay: `${i * 40}ms` }}
                    >
                      <div className="flex flex-col">
                        <span className="text-[8px] sm:text-[10px] text-white/50 uppercase tracking-widest font-mono mb-1">
                          {format(displayDate, 'MMM d, EEE')}
                        </span>
                        <span className={cn('text-lg sm:text-2xl font-black uppercase tracking-tighter leading-none', TYPE_COLOR[wt])}>
                          {wt}
                        </span>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-xl sm:text-3xl font-black tabular-nums text-white leading-none">
                          {totalReps}
                        </span>
                        <p className="text-[8px] sm:text-[10px] font-mono text-white/30 uppercase tracking-widest mt-1">
                          TOTAL REPS
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
