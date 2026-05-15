'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ChevronLeft, Scale } from 'lucide-react';
import { WorkoutData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ProgressPacePanel } from '@/components/ProgressPacePanel';
import { TopBar } from './TopBar';
import { getBodyTrendSummary, getProgressDiagnosis, getProgressSignal, getRoutineAdjustmentDecision } from '@/lib/progress-insights';
import { getDefaultProgramSummary, loadProgramSummaryForData } from '@/lib/program-summary';
import { loadDailyLogs } from '@/lib/storage';
import { WatchListItem, WatchSignalPanel } from './WatchSurface';

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
      frontier: summary.frontier,
      bodyTrend: getBodyTrendSummary(loadDailyLogs()),
    };
  }, [data, mounted]);

  const totalSessions = useMemo(
    () => Object.values(data).filter((s) => s.logged_at).length,
    [data]
  );

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
          <ProgressPacePanel frontier={progress.frontier} active />
          <RoutineDecisionSummary decision={progress.routineDecision} />

          <div className="flex flex-col gap-2">
            <WatchListItem
              onClick={() => router.push('/muscles')}
              icon={Activity}
              title="Muscles"
              subtitle="Routine, today, 7 days"
              subtle
              className="py-3"
            />

            <WatchListItem
              onClick={() => router.push('/history/detail')}
              icon={Activity}
              title="Detail"
              subtitle="Volume, recovery, and load"
              subtle
              className="py-3"
            />

            <BodyTrendRow trend={progress.bodyTrend} />
          </div>
        </div>
      )}
    </div>
  );
}

function BodyTrendRow({ trend }: { trend: ReturnType<typeof getBodyTrendSummary> }) {
  const weight = trend.weightTrendKgPerWeek === null
    ? '--'
    : `${trend.weightTrendKgPerWeek > 0 ? '+' : ''}${trend.weightTrendKgPerWeek.toFixed(1)}kg`;
  const waist = trend.waistTrendCmPerWeek === null
    ? '--'
    : `${trend.waistTrendCmPerWeek > 0 ? '+' : ''}${trend.waistTrendCmPerWeek.toFixed(1)}cm`;

  return (
    <WatchListItem
      icon={Scale}
      title="Body"
      subtitle={trend.recoveryAlert ?? trend.nutritionAction}
      metric={`${weight} / ${waist}`}
      trailing={null}
      subtle
      className="py-3"
    />
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
