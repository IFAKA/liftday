'use client';

import { useMemo } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, Copy, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { WorkoutData, WorkoutType, setEntryReps } from '@/lib/types';
import { PUSH_EXERCISES, PULL_EXERCISES, LEGS_EXERCISES, EXERCISES } from '@/lib/constants';
import { getSetsForWeek, getWeekNumber, getWorkoutPatterns } from '@/lib/workout-utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TopBar } from './TopBar';
import { getFirstSessionDate, loadUserProfile } from '@/lib/storage';
import { getRoutine } from '@/lib/routines';
import { resolveExerciseKey } from '@/lib/tiers';
import { scoreRoutine } from '@/lib/routine-score';
import { formatProgressForPrompt, getProgressFrontier, getProgressSignal } from '@/lib/progress-insights';
import { ProgressFrontierGraph } from './ProgressFrontierGraph';

interface HistoryScreenProps {
  data: WorkoutData;
  onBack: () => void;
}

const TYPE_COLOR: Record<Exclude<WorkoutType, 'rest'>, string> = {
  push: 'text-orange-400',
  pull: 'text-blue-400',
  legs: 'text-green-400',
};

function formatHour(h: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:00 ${period}`;
}

export function HistoryScreen({ data, onBack }: HistoryScreenProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const patterns = useMemo(() => getWorkoutPatterns(data), [data]);
  const progress = useMemo(() => {
    const today = new Date();
    const profile = loadUserProfile();
    const routine = getRoutine(profile?.activeRoutine ?? 'calisthenics');
    const weekNumber = getWeekNumber(getFirstSessionDate(), today);
    const setsPerExercise = getSetsForWeek(weekNumber, profile?.setsPerExercise);
    const tiers = profile?.tiers ?? {};
    const weeklyExercises = routine.tierChains
      .map((chain) => {
        const key = resolveExerciseKey(chain, tiers);
        return EXERCISES.find((e) => e.key === key)!;
      })
      .filter(Boolean);
    const score = scoreRoutine(routine, { tiers, setsPerExercise });
    const signal = getProgressSignal(data, weeklyExercises);

    return {
      signal,
      frontier: getProgressFrontier(data, weeklyExercises, score, signal),
      prompt: formatProgressForPrompt(data, weeklyExercises, signal),
    };
  }, [data]);

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
  const visibleSessions = recentSessions.slice(0, 6);
  const olderSessions = recentSessions.slice(6);

  const prs = useMemo(() => {
    const result: Record<string, number> = {};
    for (const session of Object.values(data)) {
      if (!session.logged_at) continue;
      for (const ex of EXERCISES) {
        const sets = session[ex.key];
        if (sets && sets.length > 0) {
          const best = Math.max(...sets.map(setEntryReps));
          if (!result[ex.key] || best > result[ex.key]) result[ex.key] = best;
        }
      }
    }
    return result;
  }, [data]);

  async function handleCopyProgress() {
    await copyText(progress.prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

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
            <span className="text-fluid-ui font-black uppercase tracking-tight text-white leading-none">Progress</span>
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
          <div className="w-full rounded-2xl bg-white/5 border border-white/5 p-5 mb-4">
            <ProgressFrontierGraph frontier={progress.frontier} />
          </div>

          <details className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-white/35">
              Details
            </summary>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyProgress}
              className={cn(
                'mt-3 w-full rounded-xl border bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white active:scale-[0.98]',
                copied && 'text-green-400 border-green-400/30 bg-green-400/10'
              )}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span className="text-[11px] font-black uppercase tracking-widest font-mono">{copied ? 'Copied' : 'Copy Progress'}</span>
            </Button>
            <div className="mt-3 w-full rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-1">
              <p className={cn('text-[10px] uppercase tracking-widest font-mono', progress.signal.tone)}>{progress.signal.label}</p>
              <p className="text-sm text-zinc-300 font-mono">{progress.signal.summary}</p>
              <p className="text-xs text-zinc-500 font-mono">{progress.signal.nextAction}</p>
            </div>

            {patterns.sessionCount >= 3 && (
              <div className="mt-3 w-full rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-2">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Your Patterns</p>
                {patterns.usualDays.length > 0 && (
                  <p className="text-sm text-zinc-400 font-mono">
                    Usually trains{' '}
                    <span className="text-white">{patterns.usualDays.join(' · ')}</span>
                  </p>
                )}
                {patterns.avgStartHour !== null && (
                  <p className="text-sm text-zinc-400 font-mono flex items-center gap-2">
                    <span>
                      Usually at{' '}
                      <span className="text-white">{formatHour(patterns.avgStartHour)}</span>
                    </span>
                    {patterns.isPeakHour && (
                      <span className="text-[10px] text-amber-400 border border-amber-400/30 rounded px-1.5 py-0.5">
                        peak hours
                      </span>
                    )}
                  </p>
                )}
                {patterns.avgDurationMin !== null && (
                  <p className="text-sm text-zinc-400 font-mono">
                    Avg session{' '}
                    <span className="text-white">{patterns.avgDurationMin} min</span>
                  </p>
                )}
              </div>
            )}
          </details>

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
                {visibleSessions.map(([dateKey, session]) => (
                  <SessionRow key={dateKey} dateKey={dateKey} session={session} onOpen={() => router.push(`/history/${dateKey}`)} />
                ))}
              </div>
              {olderSessions.length > 0 && (
                <details className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-white/35">
                    Older Sessions
                  </summary>
                  <div className="mt-3 flex flex-col gap-3">
                    {olderSessions.map(([dateKey, session]) => (
                      <SessionRow key={dateKey} dateKey={dateKey} session={session} onOpen={() => router.push(`/history/${dateKey}`)} compact />
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SessionRow({
  dateKey,
  session,
  onOpen,
  compact = false,
}: {
  dateKey: string;
  session: WorkoutData[string];
  onOpen: () => void;
  compact?: boolean;
}) {
  const wt = session.workout_type;
  const exercises = wt === 'push' ? PUSH_EXERCISES : wt === 'pull' ? PULL_EXERCISES : LEGS_EXERCISES;
  const totalReps = exercises.reduce((sum, ex) => {
    const sets = session[ex.key];
    return sum + (sets ? sets.reduce<number>((s, e) => s + setEntryReps(e), 0) : 0);
  }, 0);
  const displayDate = new Date(dateKey + 'T12:00:00');

  return (
    <Card
      className={cn(
        'flex-row items-center justify-between gap-0 rounded-2xl bg-white/10 border-white/5 shadow-lg cursor-pointer active:scale-95 transition-transform',
        compact ? 'px-4 py-4' : 'px-6 py-6'
      )}
      onClick={onOpen}
    >
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
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back for browsers that expose the API but reject without a secure context.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}
