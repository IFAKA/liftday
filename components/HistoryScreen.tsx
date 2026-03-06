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

import { TopBar } from './TopBar';

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
    <div className="flex flex-col h-full bg-black overflow-hidden relative">
      <TopBar
        leftAction={
          <button onClick={onBack} className="p-2 -ml-2 text-white/50 active:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
        }
        center={
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-tight text-white">History</span>
            <span className="text-[8px] text-white/40 font-mono tracking-widest -mt-0.5">{totalSessions} SESSIONS</span>
          </div>
        }
      />

      {totalSessions === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">No sessions yet.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-2 pb-4 no-scrollbar mt-2">
          {/* Best Sets - Compact Grid */}
          {Object.keys(prs).length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <Trophy className="w-3 h-3 text-yellow-500" />
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/40">Best Sets</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {EXERCISES.filter((ex) => prs[ex.key]).map((ex) => (
                  <div key={ex.key} className="rounded-xl p-2 bg-[#111] flex flex-col justify-between aspect-square min-h-0">
                    <p className="text-[8px] font-bold text-white/60 leading-tight uppercase truncate">{ex.name}</p>
                    <div className="mt-auto">
                      <p className="text-xl font-black tabular-nums tracking-tighter text-white leading-none">{prs[ex.key]}</p>
                      <p className="text-[7px] font-mono text-white/30 uppercase tracking-widest mt-0.5">{ex.unit === 'seconds' ? 'Secs' : 'Reps'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Workouts - Compact List */}
          {recentSessions.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/40 px-1">Recent</p>
              <div className="flex flex-col gap-2">
                {recentSessions.map(([dateKey, session]) => {
                  const wt = session.workout_type;
                  const exercises = wt === 'push' ? PUSH_EXERCISES : wt === 'pull' ? PULL_EXERCISES : LEGS_EXERCISES;
                  const totalReps = exercises.reduce((sum, ex) => {
                    const reps = session[ex.key];
                    return sum + (reps ? reps.reduce((s, r) => s + r, 0) : 0);
                  }, 0);
                  const displayDate = new Date(dateKey + 'T12:00:00');

                  return (
                    <div key={dateKey} className="flex items-center justify-between p-2 rounded-xl bg-[#111]">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-white/40 uppercase tracking-widest font-mono mb-0.5">{format(displayDate, 'MMM d, EEE')}</span>
                        <span className={cn('text-sm font-black uppercase tracking-tight leading-none', TYPE_COLOR[wt])}>{wt}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black tabular-nums text-white leading-none">{totalReps}</span>
                        <p className="text-[7px] font-mono text-white/30 uppercase tracking-widest mt-0.5">REPS</p>
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
