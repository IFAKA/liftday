'use client';

import { useMemo, useEffect } from 'react';
import { ArrowLeft, Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, startOfWeek, addDays, subWeeks } from 'date-fns';
import { cn } from '@/lib/utils';
import { WorkoutData, WorkoutType } from '@/lib/types';
import { PUSH_EXERCISES, PULL_EXERCISES, LEGS_EXERCISES, EXERCISES } from '@/lib/constants';
import { formatDateKey } from '@/lib/workout-utils';

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

const TYPE_BG: Record<Exclude<WorkoutType, 'rest'>, string> = {
  push: 'bg-orange-400/10',
  pull: 'bg-blue-400/10',
  legs: 'bg-green-400/10',
};

export function HistoryScreen({ data, currentDate, onBack }: HistoryScreenProps) {
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
      .slice(0, 8);
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

  const weeklyData = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const offset = 7 - i;
      const weekStart = startOfWeek(subWeeks(currentDate, offset), { weekStartsOn: 1 });
      let sessions = 0;
      for (let d = 0; d < 7; d++) {
        const key = formatDateKey(addDays(weekStart, d));
        if (data[key]?.logged_at) sessions++;
      }
      const label =
        offset === 0 ? 'This' : offset === 1 ? 'Last' : format(weekStart, 'MMM d');
      return { label, sessions };
    });
  }, [data, currentDate]);

  return (
    <div className="flex flex-col h-[100dvh] bg-background p-6 overflow-hidden">
      <div
        className="flex items-center gap-4 pt-2 shrink-0 mb-8"
        style={{ animation: 'slide-down-in 260ms ease-out backwards' }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-4 p-2 -ml-2 rounded-xl hover:bg-muted active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          <h1 className="text-lg font-bold tracking-tight uppercase">History</h1>
        </button>
        <span className="ml-auto text-sm text-muted-foreground font-mono">
          {totalSessions} sessions
        </span>
      </div>

      {totalSessions === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No sessions yet. Start training!</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 space-y-8">
          {/* Weekly consistency chart */}
          <div className="space-y-3" style={{ animation: 'slide-up-in 260ms ease-out 80ms backwards' }}>
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-muted-foreground/60">
                Weekly Sessions
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground/50">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-foreground inline-block" />
                  5+
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-muted-foreground inline-block" />
                  3–4
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-muted inline-block" />
                  1–2
                </span>
              </div>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} barSize={20} margin={{ left: -20 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number | undefined) => [`${value ?? 0} sessions`, '']}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    cursor={{ fill: 'hsl(var(--muted))' }}
                  />
                  <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
                    {weeklyData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.sessions >= 5
                            ? 'hsl(var(--foreground))'
                            : entry.sessions >= 3
                              ? 'hsl(var(--muted-foreground))'
                              : 'hsl(var(--muted))'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Personal Records */}
          {Object.keys(prs).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground/60">
                  Personal Records
                </p>
                <Trophy className="w-3.5 h-3.5 text-yellow-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {EXERCISES.filter((ex) => prs[ex.key]).map((ex, i) => (
                  <div
                    key={ex.key}
                    className={cn('rounded-lg p-3', TYPE_BG[ex.workoutType])}
                    style={{ animation: 'stagger-in 260ms ease-out backwards', animationDelay: `${120 + i * 60}ms` }}
                  >
                    <p className="text-xs text-muted-foreground truncate">{ex.name}</p>
                    <p className="text-2xl font-mono font-bold mt-0.5">{prs[ex.key]}</p>
                    <p className="text-xs text-muted-foreground/60">best set</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent sessions */}
          {recentSessions.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground/60">
                Recent Sessions
              </p>
              <div className="space-y-2">
                {recentSessions.map(([dateKey, session], i) => {
                  const wt = session.workout_type;
                  const exercises =
                    wt === 'push'
                      ? PUSH_EXERCISES
                      : wt === 'pull'
                        ? PULL_EXERCISES
                        : LEGS_EXERCISES;
                  const totalReps = exercises.reduce((sum, ex) => {
                    const reps = session[ex.key];
                    return sum + (reps ? reps.reduce((s, r) => s + r, 0) : 0);
                  }, 0);
                  const displayDate = new Date(dateKey + 'T12:00:00');

                  return (
                    <div
                      key={dateKey}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg bg-card/50"
                      style={{ animation: 'stagger-in 260ms ease-out backwards', animationDelay: `${100 + i * 60}ms` }}
                    >
                      <div className="flex flex-col items-center min-w-[3rem]">
                        <span className="text-xs text-muted-foreground uppercase">
                          {format(displayDate, 'EEE')}
                        </span>
                        <span className="text-sm font-mono">
                          {format(displayDate, 'MMM d')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          className={cn(
                            'text-sm font-medium uppercase tracking-wider',
                            TYPE_COLOR[wt]
                          )}
                        >
                          {wt}
                        </span>
                        <div className="flex gap-2 flex-wrap mt-0.5">
                          {exercises.map((ex) => {
                            const reps = session[ex.key];
                            if (!reps) return null;
                            return (
                              <span
                                key={ex.key}
                                className="text-xs font-mono text-muted-foreground"
                              >
                                {reps.join('·')}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-lg font-mono font-bold">{totalReps}</span>
                        <p className="text-xs text-muted-foreground">reps</p>
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
