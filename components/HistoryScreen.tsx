'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkoutData, setEntryReps } from '@/lib/types';
import { EXERCISES } from '@/lib/constants';
import { getSetsForWeek, getWeekNumber } from '@/lib/workout-utils';
import { Button } from '@/components/ui/button';
import { TopBar } from './TopBar';
import { getFirstSessionDate, loadUserProfile } from '@/lib/storage';
import { getRoutine } from '@/lib/routines';
import { resolveExerciseKey } from '@/lib/tiers';
import { scoreRoutine } from '@/lib/routine-score';
import { getProgressDiagnosis, getProgressSignal, getRoutineAdjustmentDecision } from '@/lib/progress-insights';

interface HistoryScreenProps {
  data: WorkoutData;
  onBack: () => void;
}

export function HistoryScreen({ data, onBack }: HistoryScreenProps) {
  const router = useRouter();

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
    const diagnosis = getProgressDiagnosis(data, weeklyExercises, score);

    return {
      signal,
      diagnosis,
      routineDecision: getRoutineAdjustmentDecision(data, diagnosis, score, signal),
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
          <RoutineDecisionSummary decision={progress.routineDecision} />

          <button
            type="button"
            className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl bg-white/[0.03] border border-white/5 active:bg-white/10 transition-all text-left"
            onClick={() => router.push('/history/detail')}
          >
            <div className="flex-1 flex flex-col items-start gap-1 min-w-0">
              <span className="text-fluid-label font-mono uppercase tracking-widest text-white/40">Diagnostics</span>
              <span className="text-fluid-ui font-black uppercase tracking-tight text-white">Training Detail</span>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 shrink-0" />
          </button>

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
            <button
              type="button"
              className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl bg-white/[0.03] border border-white/5 active:bg-white/10 transition-all text-left"
              onClick={() => router.push('/history/sessions')}
            >
              <div className="flex-1 flex flex-col items-start gap-1 min-w-0">
                <span className="text-fluid-label font-mono uppercase tracking-widest text-white/40">History</span>
                <span className="text-fluid-ui font-black uppercase tracking-tight text-white">Recent Sessions</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-fluid-label font-mono text-white/40 tabular-nums">{recentSessions.length}</span>
                <ChevronRight className="w-5 h-5 text-white/30" />
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RoutineDecisionSummary({
  decision,
}: {
  decision: ReturnType<typeof getRoutineAdjustmentDecision>;
}) {
  return (
    <div className="w-full rounded-2xl bg-white/[0.03] border border-white/5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={cn('text-fluid-label font-mono uppercase tracking-widest', decision.tone)}>
            {decision.label}
          </p>
          <p className="mt-1 text-fluid-ui font-black uppercase tracking-tight text-white leading-tight">
            {decision.summary}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/45">
          Auto
        </span>
      </div>
      <p className="mt-4 text-fluid-label font-mono uppercase tracking-wide text-white/50">
        {decision.nextAction}
      </p>
      <p className="mt-3 text-[10px] font-mono uppercase tracking-widest text-white/30">
        {decision.automation}
      </p>
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
