'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Trophy } from 'lucide-react';
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
import { WatchListItem, WatchPanel } from './WatchSurface';

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

          <WatchListItem
            onClick={() => router.push('/history/detail')}
            label="Diagnostics"
            title="Training Detail"
            subtle
          />

          {/* Personal Bests — single list item */}
          {Object.keys(prs).length > 0 && (
            <WatchListItem
              onClick={() => router.push('/history/personal-bests')}
              icon={Trophy}
              label="Records"
              title="Personal Bests"
              metric={Object.keys(prs).length}
            />
          )}

          {/* Recent Workouts - List */}
          {recentSessions.length > 0 && (
            <WatchListItem
              onClick={() => router.push('/history/sessions')}
              label="History"
              title="Recent Sessions"
              metric={recentSessions.length}
              subtle
            />
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
    <WatchPanel subtle>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={cn('text-fluid-label font-mono uppercase', decision.tone)}>
            {decision.label}
          </p>
          <p className="mt-1 text-fluid-ui font-black uppercase text-white leading-tight">
            {decision.summary}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-xs font-black uppercase text-white/45">
          Auto
        </span>
      </div>
      <p className="mt-3 text-fluid-label font-mono uppercase text-white/50">
        {decision.nextAction}
      </p>
    </WatchPanel>
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
    <WatchPanel>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={cn('text-fluid-label font-mono uppercase', signal.tone)}>
            {signal.label}
          </p>
          <p className="mt-1 text-fluid-ui font-black uppercase text-white leading-tight">
            {signal.summary}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn('text-fluid-ui font-black tabular-nums leading-none', diagnosis.averageChangePct === null ? 'text-white/35' : diagnosis.tone)}>
            {changeLabel}
          </p>
          <p className="mt-1 text-fluid-label font-mono uppercase text-white/30">
            Avg
          </p>
        </div>
      </div>

      <p className="mt-3 text-fluid-label font-mono uppercase text-white/50">
        {signal.nextAction}
      </p>
      <p className="mt-3 text-fluid-label font-mono uppercase text-white/30">
        {diagnosis.improvingCount} up · {diagnosis.flatCount} flat · {diagnosis.decliningCount} down
      </p>
    </WatchPanel>
  );
}
