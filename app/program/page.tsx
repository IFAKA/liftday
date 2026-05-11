'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { WeeklySplit } from '@/components/WeeklySplit';
import { OptimizationContext, RoutineConfig, WorkoutData } from '@/lib/types';
import { TopBar } from '@/components/TopBar';
import { RoutineAdjustmentDecision } from '@/lib/progress-insights';
import { loadProgramSummary } from '@/lib/program-summary';
import {
  WatchListItem,
  WatchMetricCell,
  WatchMetricGrid,
  WatchSection,
  WatchSignalPanel,
} from '@/components/WatchSurface';

export default function ProgramPage() {
  const [{ data, routine, routineDecision, adaptation }] = useState<{
    data: WorkoutData;
    routine: RoutineConfig | null;
    routineDecision: RoutineAdjustmentDecision | null;
    adaptation: OptimizationContext | null;
  }>(() => {
    if (typeof window === 'undefined') {
      return { data: {}, routine: null, routineDecision: null, adaptation: null };
    }

    const summary = loadProgramSummary();

    return {
      data: summary.data,
      routine: summary.routine,
      routineDecision: summary.routineDecision,
      adaptation: summary.adaptation,
    };
  });

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      <TopBar
        center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Program</span>}
        rightAction={
          <Link
            href="/settings"
            aria-label="Settings"
            className="-mr-2 flex size-11 items-center justify-center rounded-full text-white/55 active:bg-white/10 active:text-white"
          >
            <Settings className="w-5 h-5" />
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto px-3 pb-8 pt-2 no-scrollbar select-text flex flex-col gap-4">
        {adaptation && (
          <WatchSection title="Today">
            <AdaptiveRecommendationPanel adaptation={adaptation} />
          </WatchSection>
        )}

        {routineDecision && (
          <WatchSection title="Now">
            <RoutineDecisionPanel decision={routineDecision} />
          </WatchSection>
        )}

        {routine && (
          <WatchSection title="Program">
            <WatchListItem
              href="/program/detail"
              label="Routine"
              title={routine.name}
              subtitle="Efficiency, exercises, volume"
            />
          </WatchSection>
        )}

        <WatchSection title="Week">
          <WeeklySplit currentDate={new Date()} data={data} embedded />
        </WatchSection>
      </div>
    </div>
  );
}

function AdaptiveRecommendationPanel({ adaptation }: { adaptation: OptimizationContext }) {
  const recommendation = adaptation.recommendations[0];
  const bottleneck = adaptation.recovery.bottleneck;
  const guardrail = adaptation.targetDateGuardrail.warning;

  return (
    <WatchSignalPanel
      label="Next"
      title={recommendation.title}
      summary={`${recommendation.summary} ${recommendation.reason}`}
      metric={adaptation.objectiveScore.toFixed(1)}
      metricLabel="Score"
      tone="text-green-400"
    >
      <WatchMetricGrid columns={2}>
        <WatchMetricCell label="Recovery" value={`${Math.round(recommendation.recoveryState * 100)}%`} />
        <WatchMetricCell label="Load" value={recommendation.fatigueCost > 0 ? `+${recommendation.fatigueCost}` : recommendation.fatigueCost.toString()} />
      </WatchMetricGrid>
      {(bottleneck || guardrail) && (
        <p className="mt-3 text-fluid-label font-mono uppercase leading-relaxed text-white/35">
          {guardrail ?? `Bottleneck: ${bottleneck!.muscle.replace('_', ' ')}`}
        </p>
      )}
    </WatchSignalPanel>
  );
}

function RoutineDecisionPanel({ decision }: { decision: RoutineAdjustmentDecision }) {
  return (
    <WatchSignalPanel
      label={decision.label}
      title={decision.summary}
      action={decision.nextAction}
      metric="Auto"
      tone={decision.tone}
      subtle
    />
  );
}
