'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProgressPacePanel } from '@/components/ProgressPacePanel';
import { TopBar } from '@/components/TopBar';
import { copyText } from '@/lib/clipboard';
import { ProgressDiagnosis } from '@/lib/progress-insights';
import { getDefaultProgramSummary, loadProgramSummaryForData } from '@/lib/program-summary';
import { OptimizationContext, WorkoutData } from '@/lib/types';
import {
  WatchBackButton,
  WatchCopyButton,
  WatchPanel,
  WatchSignalPanel,
} from './WatchSurface';

export function ProgressDetailScreen({ data }: { data: WorkoutData }) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const progress = useMemo(() => {
    const summary = mounted ? loadProgramSummaryForData(data) : getDefaultProgramSummary(data);

    return {
      adaptation: summary.adaptation,
      diagnosis: summary.diagnosis,
      frontier: summary.frontier,
      prompt: summary.progressPrompt,
    };
  }, [data, mounted]);

  async function handleCopyProgress() {
    await copyText(progress.prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden relative pb-safe">
      <TopBar
        leftAction={<WatchBackButton fallbackHref="/history" />}
        center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Progress Detail</span>}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 no-scrollbar mt-2 flex flex-col gap-3">
        <ProgressPacePanel frontier={progress.frontier} />
        <AdaptiveProgressPanel adaptation={progress.adaptation} diagnosis={progress.diagnosis} />
        <WatchCopyButton copied={copied} onClick={handleCopyProgress} label="Copy Progress" />
      </div>
    </div>
  );
}

function AdaptiveProgressPanel({
  adaptation,
  diagnosis,
}: {
  adaptation: OptimizationContext;
  diagnosis: ProgressDiagnosis;
}) {
  const topVolumes = adaptation.effectiveVolume
    .filter((entry) => entry.priorityRank <= 7)
    .slice(0, 5);
  const bottleneck = adaptation.recovery.bottleneck;
  const trend = adaptation.progression.find((entry) => entry.trend !== 'insufficient_data') ?? adaptation.progression[0];
  const changeLabel = diagnosis.averageChangePct === null
    ? '--'
    : `${diagnosis.averageChangePct > 0 ? '+' : ''}${diagnosis.averageChangePct.toFixed(1)}%`;

  return (
    <div className="flex flex-col gap-3">
      <WatchSignalPanel
        label="Status"
        title={diagnosis.label}
        summary={diagnosis.summary}
        metric={<span className={diagnosis.averageChangePct === null ? 'text-white/35' : diagnosis.tone}>{changeLabel}</span>}
        metricLabel="Avg"
        tone={diagnosis.tone}
      >
        <p className="text-fluid-label font-mono uppercase text-white/35">
          Program score {adaptation.objectiveScore.toFixed(1)} · recovery {Math.round(adaptation.recovery.systemic * 100)}% · load change {Math.round(adaptation.fatigue.systemicFatigue * 100)}%
        </p>
        <p className="mt-2 text-fluid-label font-mono uppercase text-white/35">
          {formatTrend(trend?.trend)} {trend?.velocity ? `${trend.velocity > 0 ? '+' : ''}${trend.velocity.toFixed(1)}%` : ''}
          {bottleneck ? ` · fix ${bottleneck.muscle.replace('_', ' ')}` : ''}
        </p>
      </WatchSignalPanel>

      <WatchPanel subtle className="py-3">
        <p className="mb-3 text-fluid-label font-black uppercase text-white/35 font-mono">Fix First</p>
        <div className="space-y-2">
          {diagnosis.nextActions.map((action) => (
            <p key={action} className="text-fluid-label font-mono uppercase text-white/70">
              {action}
            </p>
          ))}
        </div>
      </WatchPanel>

      {topVolumes.some((entry) => entry.status === 'low') && (
        <WatchPanel subtle className="py-3">
          <p className="text-fluid-label font-mono uppercase text-white/45">
            Low volume: {topVolumes.filter((entry) => entry.status === 'low').map((entry) => entry.muscle.replace('_', ' ')).slice(0, 3).join(' · ')}
          </p>
        </WatchPanel>
      )}
    </div>
  );
}

function formatTrend(trend: string | undefined): string {
  return (trend ?? 'insufficient_data').replace('_', ' ');
}
