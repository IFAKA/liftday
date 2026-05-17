'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Dumbbell } from 'lucide-react';
import { OptimizationContext, RoutineConfig } from '@/lib/types';
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
  const [{ routine, routineDecision, adaptation }, setProgramState] = useState<{
    routine: RoutineConfig | null;
    routineDecision: RoutineAdjustmentDecision | null;
    adaptation: OptimizationContext | null;
  }>({ routine: null, routineDecision: null, adaptation: null });

  useEffect(() => {
    const summary = loadProgramSummary();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgramState({
      routine: summary.routine,
      routineDecision: summary.routineDecision,
      adaptation: summary.adaptation,
    });
  }, []);

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      <TopBar
        center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Program</span>}
        leftAction={
          <Link
            href="/"
            aria-label="Back"
            className="-ml-2 flex size-11 items-center justify-center rounded-full text-white/55 active:bg-white/10 active:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto px-3 pb-8 pt-1 no-scrollbar select-text flex flex-col gap-3">
        {adaptation && (
          <AdaptiveRecommendationPanel adaptation={adaptation} />
        )}

        {routineDecision && (
          <RoutineDecisionPanel decision={routineDecision} />
        )}

        <WatchSection title="Plan">
          <div className="flex flex-col gap-2">
            {routine && (
              <WatchListItem
                href="/program/detail"
                icon={Dumbbell}
                title="Routine"
                subtitle={routine.name}
                className="py-3"
              />
            )}
          </div>
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
      label="Do now"
      title={recommendation.title}
      summary={recommendation.summary}
      metric={adaptation.objectiveScore.toFixed(1)}
      metricLabel="Score"
      tone="text-green-400"
      active
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
      label="Watch"
      title={decision.label}
      summary={decision.summary}
      action={decision.nextAction}
      tone={decision.tone}
      subtle
      className="py-3"
    />
  );
}
