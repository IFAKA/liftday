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
import { formatProgressForPrompt, getProgressDiagnosis, getProgressFrontier, getProgressSignal } from '@/lib/progress-insights';
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
      diagnosis: getProgressDiagnosis(data, weeklyExercises, score),
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
        <div className="flex-1 overflow-y-auto px-4 pb-8 no-scrollbar mt-2 flex flex-col gap-2">
          <ProgressSummary signal={progress.signal} diagnosis={progress.diagnosis} />

          <details className="rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4">
            <summary className="cursor-pointer text-fluid-label font-black uppercase tracking-widest text-white/40">
              Training detail
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
            <div className="mt-3 w-full rounded-xl bg-black/30 border border-white/10 p-4">
              <ProgressFrontierGraph frontier={progress.frontier} diagnosis={progress.diagnosis} />
            </div>

            {patterns.sessionCount >= 3 && (
              <div className="mt-3 w-full rounded-xl bg-white/[0.03] border border-white/10 p-4 space-y-2">
                <p className="text-[10px] text-white/35 uppercase tracking-widest font-mono">Patterns</p>
                {patterns.usualDays.length > 0 && (
                  <p className="text-fluid-label text-white/45 font-mono">
                    Usually trains{' '}
                    <span className="text-white">{patterns.usualDays.join(' · ')}</span>
                  </p>
                )}
                {patterns.avgStartHour !== null && (
                  <p className="text-fluid-label text-white/45 font-mono flex items-center gap-2">
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
                  <p className="text-fluid-label text-white/45 font-mono">
                    Avg session{' '}
                    <span className="text-white">{patterns.avgDurationMin} min</span>
                  </p>
                )}
              </div>
            )}
          </details>

          {/* Personal Bests — single list item */}
          {Object.keys(prs).length > 0 && (
            <button
              type="button"
              className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl bg-white/5 border border-white/5 active:bg-white/10 transition-all text-left"
              onClick={() => router.push('/history/personal-bests')}
            >
              <Trophy className="w-5 h-5 text-yellow-500 shrink-0" />
              <div className="flex-1 flex flex-col items-start gap-1 min-w-0">
                <span className="text-fluid-label font-mono uppercase tracking-widest text-white/40">Records</span>
                <span className="text-fluid-ui font-black uppercase tracking-tight text-white">Personal Bests</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-fluid-label font-mono text-white/40 tabular-nums">{Object.keys(prs).length}</span>
                <ChevronRight className="w-5 h-5 text-white/30" />
              </div>
            </button>
          )}

          {/* Recent Workouts - List */}
          {recentSessions.length > 0 && (
            <details className="rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-4">
              <summary className="cursor-pointer text-fluid-label font-black uppercase tracking-widest text-white/40">
                Recent sessions
              </summary>
              <div className="mt-3 flex flex-col gap-2">
                {visibleSessions.map(([dateKey, session]) => (
                  <SessionRow key={dateKey} dateKey={dateKey} session={session} onOpen={() => router.push(`/history/${dateKey}`)} />
                ))}
                {olderSessions.map(([dateKey, session]) => (
                  <SessionRow key={dateKey} dateKey={dateKey} session={session} onOpen={() => router.push(`/history/${dateKey}`)} compact />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function ProgressSummary({
  signal,
  diagnosis,
}: {
  signal: ReturnType<typeof getProgressSignal>;
  diagnosis: ReturnType<typeof getProgressDiagnosis>;
}) {
  const changeLabel = diagnosis.averageChangePct === null
    ? '--'
    : `${diagnosis.averageChangePct > 0 ? '+' : ''}${diagnosis.averageChangePct.toFixed(1)}%`;

  return (
    <div className="w-full rounded-2xl bg-white/5 border border-white/5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={cn('text-fluid-label font-mono uppercase tracking-widest', signal.tone)}>
            {signal.label}
          </p>
          <p className="mt-1 text-fluid-ui font-black uppercase tracking-tight text-white leading-tight">
            {signal.summary}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn('text-fluid-ui font-black tabular-nums leading-none', diagnosis.averageChangePct === null ? 'text-white/35' : diagnosis.tone)}>
            {changeLabel}
          </p>
          <p className="mt-1 text-fluid-label font-mono uppercase tracking-widest text-white/30">
            Avg
          </p>
        </div>
      </div>

      <p className="mt-4 text-fluid-label font-mono uppercase tracking-wide text-white/50">
        {signal.nextAction}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <ProgressPill label="up" value={diagnosis.improvingCount.toString()} tone="text-green-400" />
        <ProgressPill label="flat" value={diagnosis.flatCount.toString()} tone="text-yellow-400" />
        <ProgressPill label="down" value={diagnosis.decliningCount.toString()} tone="text-red-400" />
      </div>
    </div>
  );
}

function ProgressPill({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/25 px-3 py-2">
      <p className="text-[10px] font-mono uppercase tracking-widest text-white/25">{label}</p>
      <p className={cn('text-fluid-ui font-black tabular-nums leading-none', tone)}>{value}</p>
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
        'flex-row items-center justify-between gap-0 rounded-2xl bg-white/5 border-white/5 shadow-none cursor-pointer active:bg-white/10 transition-colors',
        compact ? 'px-4 py-4' : 'px-5 py-5'
      )}
      onClick={onOpen}
    >
      <div className="flex flex-col">
        <span className="text-fluid-label text-white/40 uppercase tracking-widest font-mono font-black mb-1">{format(displayDate, 'MMM d, EEE')}</span>
        <span className={cn('text-fluid-ui font-black uppercase tracking-tight leading-none', TYPE_COLOR[wt])}>{wt}</span>
      </div>
      <div className="text-right">
        <span className="text-fluid-ui font-black tabular-nums text-white leading-none">{totalReps}</span>
        <p className="text-fluid-label font-black font-mono text-white/40 uppercase tracking-widest mt-1">Reps</p>
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
