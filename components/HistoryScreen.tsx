'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Scale } from 'lucide-react';
import { WorkoutData } from '@/lib/types';
import { getProgressStatusCommand } from '@/components/status-command';
import { TopBar } from './TopBar';
import { getBodyTrendSummary, getProgressDiagnosis, getProgressSignal, getRoutineAdjustmentDecision } from '@/lib/progress-insights';
import { getDefaultProgramSummary, loadProgramSummaryForData } from '@/lib/program-summary';
import { loadDailyLogs } from '@/lib/storage';
import { WatchBackButton, WatchListItem, WatchScreen, WatchSignalPanel } from './WatchSurface';

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
    <WatchScreen
      top={(
        <TopBar
          leftAction={<WatchBackButton onClick={onBack} fallbackHref="/" />}
          center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white leading-none">Progress</span>}
        />
      )}
      bodyClassName={totalSessions === 0 ? 'flex flex-col items-center justify-center px-4 text-center' : 'px-3 pt-1 flex flex-col gap-3'}
    >
      {totalSessions === 0 ? (
        <p className="text-white/40 text-fluid-ui uppercase tracking-widest font-bold">No sessions yet.</p>
      ) : (
        <>
          <ProgressSummary
            signal={progress.signal}
            diagnosis={progress.diagnosis}
            frontier={progress.frontier}
            totalSessions={totalSessions}
          />
          <RoutineDecisionSummary decision={progress.routineDecision} />

          <div className="flex flex-col gap-2">
            <WatchListItem
              onClick={() => router.push('/history/detail')}
              icon={Activity}
              title="Detail"
              subtitle="Load and recovery"
              subtle
              className="py-3"
            />

            <BodyTrendRow trend={progress.bodyTrend} />
          </div>
        </>
      )}
    </WatchScreen>
  );
}

function BodyTrendRow({ trend }: { trend: ReturnType<typeof getBodyTrendSummary> }) {
  const router = useRouter();
  const weight = trend.weightTrendKgPerWeek === null
    ? '--'
    : `${trend.weightTrendKgPerWeek > 0 ? '+' : ''}${trend.weightTrendKgPerWeek.toFixed(1)}kg`;
  const waist = trend.waistTrendCmPerWeek === null
    ? '--'
    : `${trend.waistTrendCmPerWeek > 0 ? '+' : ''}${trend.waistTrendCmPerWeek.toFixed(1)}cm`;

  return (
    <WatchListItem
      onClick={() => router.push('/history/body')}
      icon={Scale}
      title="Body"
      subtitle={trend.recoveryAlert ?? `Measures · ${trend.nutritionAction}`}
      metric={`${weight} / ${waist}`}
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
      title={decision.label === 'Hold structure' ? 'Keep routine' : decision.label}
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
  frontier,
  totalSessions,
}: {
  signal: ReturnType<typeof getProgressSignal>;
  diagnosis: ReturnType<typeof getProgressDiagnosis>;
  frontier: ReturnType<typeof loadProgramSummaryForData>['frontier'];
  totalSessions: number;
}) {
  const command = getProgressStatusCommand(signal, diagnosis, frontier);
  const changeLabel = diagnosis.averageChangePct === null
    ? '--'
    : `${diagnosis.averageChangePct > 0 ? '+' : ''}${diagnosis.averageChangePct.toFixed(1)}%`;

  return (
    <WatchSignalPanel
      label={command.label}
      title={command.title}
      summary={command.summary}
      action={command.action}
      metric={<span className={diagnosis.averageChangePct === null ? 'text-white/35' : command.tone}>{changeLabel}</span>}
      metricLabel={`${totalSessions} sessions`}
      tone={command.tone}
      active
    />
  );
}
