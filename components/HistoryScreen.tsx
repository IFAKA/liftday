'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, CalendarDays, ChevronLeft, Trophy } from 'lucide-react';
import { WorkoutData, setEntryReps } from '@/lib/types';
import { EXERCISES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { TopBar } from './TopBar';
import { getBodyTrendSummary, getProgressDiagnosis, getProgressSignal, getRoutineAdjustmentDecision } from '@/lib/progress-insights';
import { getDefaultProgramSummary, loadProgramSummaryForData } from '@/lib/program-summary';
import { loadDailyLogs } from '@/lib/storage';
import { WatchListItem, WatchMetricCell, WatchMetricGrid, WatchPanel, WatchSignalPanel } from './WatchSurface';

interface HistoryScreenProps {
  data: WorkoutData;
  onBack?: () => void;
}

export function HistoryScreen({ data, onBack }: HistoryScreenProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const progress = useMemo(() => {
    const summary = mounted ? loadProgramSummaryForData(data) : getDefaultProgramSummary(data);

    return {
      signal: summary.signal,
      diagnosis: summary.diagnosis,
      routineDecision: summary.routineDecision,
      bodyTrend: getBodyTrendSummary(loadDailyLogs()),
    };
  }, [data, mounted]);

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
          <Button variant="ghost" size="icon" aria-label="Back" onClick={onBack ?? (() => router.push('/'))} className="-ml-2 text-white/50 hover:text-white hover:bg-transparent active:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        }
        center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white leading-none">Progress</span>}
      />

      {totalSessions === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <p className="text-white/40 text-fluid-ui uppercase tracking-widest font-bold">No sessions yet.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-3 pb-8 no-scrollbar mt-1 flex flex-col gap-3">
          <ProgressSummary signal={progress.signal} diagnosis={progress.diagnosis} totalSessions={totalSessions} />
          <RoutineDecisionSummary decision={progress.routineDecision} />
          <BodyTrendPanel trend={progress.bodyTrend} />

          <div className="flex flex-col gap-2">
            <WatchListItem
              onClick={() => router.push('/history/detail')}
              icon={Activity}
              title="Detail"
              subtitle="Volume, recovery, and load"
              subtle
              className="py-3"
            />

            {Object.keys(prs).length > 0 && (
              <WatchListItem
                onClick={() => router.push('/history/personal-bests')}
                icon={Trophy}
                title="Best Sets"
                metric={Object.keys(prs).length}
                className="py-3"
              />
            )}

            {recentSessions.length > 0 && (
              <WatchListItem
                onClick={() => router.push('/history/sessions')}
                icon={CalendarDays}
                title="Sessions"
                metric={recentSessions.length}
                subtle
                className="py-3"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BodyTrendPanel({ trend }: { trend: ReturnType<typeof getBodyTrendSummary> }) {
  const weight = trend.weightTrendKgPerWeek === null
    ? '--'
    : `${trend.weightTrendKgPerWeek > 0 ? '+' : ''}${trend.weightTrendKgPerWeek.toFixed(1)}kg`;
  const waist = trend.waistTrendCmPerWeek === null
    ? '--'
    : `${trend.waistTrendCmPerWeek > 0 ? '+' : ''}${trend.waistTrendCmPerWeek.toFixed(1)}cm`;

  return (
    <WatchPanel subtle>
      <WatchMetricGrid columns={2}>
        <WatchMetricCell label="Weight" value={weight} />
        <WatchMetricCell label="Waist" value={waist} />
      </WatchMetricGrid>
      <p className="mt-3 text-fluid-label font-mono uppercase text-white/50">
        {trend.recoveryAlert ?? trend.nutritionAction}
      </p>
    </WatchPanel>
  );
}

function RoutineDecisionSummary({
  decision,
}: {
  decision: ReturnType<typeof getRoutineAdjustmentDecision>;
}) {
  return (
    <WatchSignalPanel
      label="Attention"
      title={decision.label}
      summary={decision.summary}
      action={decision.nextAction}
      tone={decision.tone}
      subtle
      className="py-3"
    />
  );
}

function ProgressSummary({
  signal,
  diagnosis,
  totalSessions,
}: {
  signal: ReturnType<typeof getProgressSignal>;
  diagnosis: ReturnType<typeof getProgressDiagnosis>;
  totalSessions: number;
}) {
  const changeLabel = diagnosis.averageChangePct === null
    ? '--'
    : `${diagnosis.averageChangePct > 0 ? '+' : ''}${diagnosis.averageChangePct.toFixed(1)}%`;

  return (
    <WatchSignalPanel
      label="Changed"
      title={signal.summary}
      action={signal.nextAction}
      metric={<span className={diagnosis.averageChangePct === null ? 'text-white/35' : diagnosis.tone}>{changeLabel}</span>}
      metricLabel={`${totalSessions} sessions`}
      tone={signal.tone}
      active
    >
      <p className="mt-3 text-fluid-label font-mono uppercase text-white/30">
        {diagnosis.improvingCount} up · {diagnosis.flatCount} flat · {diagnosis.decliningCount} down
      </p>
    </WatchSignalPanel>
  );
}
