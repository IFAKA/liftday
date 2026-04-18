'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { WorkoutData, WorkoutType } from '@/lib/types';
import { PUSH_EXERCISES, PULL_EXERCISES, LEGS_EXERCISES, EXERCISES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TopBar } from './TopBar';

interface HistoryScreenProps {
  data: WorkoutData;
  onBack: () => void;
}

const TYPE_COLOR: Record<Exclude<WorkoutType, 'rest'>, string> = {
  push: 'text-orange-400',
  pull: 'text-blue-400',
  legs: 'text-green-400',
};

export function HistoryScreen({ data, onBack }: HistoryScreenProps) {
  const router = useRouter();

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
    <div className="flex flex-col h-full bg-black overflow-hidden relative pb-safe">
      <TopBar
        leftAction={
          <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack} className="-ml-2 text-white/50 hover:text-white hover:bg-transparent active:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        }
        center={
          <div className="flex flex-col items-center">
            <span className="text-fluid-ui font-black uppercase tracking-tight text-white leading-none">History</span>
            <span className="text-fluid-label text-white/40 font-mono tracking-widest mt-0.5">{totalSessions} SESSIONS</span>
          </div>
        }
      />

      {totalSessions === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <p className="text-white/40 text-fluid-ui uppercase tracking-widest font-bold">No sessions yet.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pb-8 no-scrollbar mt-2">
          {/* Personal Bests — single list item */}
          {Object.keys(prs).length > 0 && (
            <div className="mb-4">
              <Card className="flex-row items-center justify-between px-6 py-6 gap-0 rounded-2xl bg-white/10 border-white/5 shadow-lg cursor-pointer active:scale-95 transition-transform" onClick={() => router.push('/history/personal-bests')}>
                <div className="flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-yellow-500 shrink-0" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-fluid-ui font-black uppercase tracking-tight text-white leading-none">Personal Bests</span>
                    <span className="text-fluid-label font-mono text-white/40">All-time records per exercise</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-fluid-label font-mono text-white/40 tabular-nums">{Object.keys(prs).length}</span>
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </div>
              </Card>
            </div>
          )}

          {/* Recent Workouts - List */}
          {recentSessions.length > 0 && (
            <div className="space-y-4">
              <p className="text-fluid-label font-black uppercase tracking-widest text-white/80 px-1">Recent Sessions</p>
              <div className="flex flex-col gap-3">
                {recentSessions.map(([dateKey, session]) => {
                  const wt = session.workout_type;
                  const exercises = wt === 'push' ? PUSH_EXERCISES : wt === 'pull' ? PULL_EXERCISES : LEGS_EXERCISES;
                  const totalReps = exercises.reduce((sum, ex) => {
                    const reps = session[ex.key];
                    return sum + (reps ? reps.reduce((s, r) => s + r, 0) : 0);
                  }, 0);
                  const displayDate = new Date(dateKey + 'T12:00:00');

                  return (
                    <Card key={dateKey} className="flex-row items-center justify-between px-6 py-6 gap-0 rounded-2xl bg-white/10 border-white/5 shadow-lg cursor-pointer active:scale-95 transition-transform" onClick={() => router.push(`/history/${dateKey}`)}>
                      <div className="flex flex-col">
                        <span className="text-fluid-label text-white/60 uppercase tracking-widest font-mono font-black mb-2">{format(displayDate, 'MMM d, EEE')}</span>
                        <span className={cn('text-fluid-exercise font-black uppercase tracking-tight leading-none', TYPE_COLOR[wt])}>{wt}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-fluid-exercise font-black tabular-nums text-white leading-none">{totalReps}</span>
                        <p className="text-fluid-label font-black font-mono text-white/50 uppercase tracking-widest mt-2">TOTAL REPS</p>
                      </div>
                    </Card>
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
