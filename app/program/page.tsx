'use client';

import { useEffect, useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { OptimizationContext, RoutineConfig } from '@/lib/types';
import { TopBar } from '@/components/TopBar';
import { RoutineAdjustmentDecision } from '@/lib/progress-insights';
import { loadProgramSummary } from '@/lib/program-summary';
import { getProgramStatusCommand } from '@/components/status-command';
import {
  WatchBackButton,
  WatchDetailsPanel,
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
        leftAction={<WatchBackButton href="/" />}
      />

      <div className="flex-1 overflow-y-auto px-3 pb-8 pt-1 no-scrollbar select-text flex flex-col gap-3">
        {adaptation && (
          <ProgramGuidancePanel adaptation={adaptation} routineDecision={routineDecision} />
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

function ProgramGuidancePanel({
  adaptation,
  routineDecision,
}: {
  adaptation: OptimizationContext;
  routineDecision: RoutineAdjustmentDecision | null;
}) {
  const recommendation = adaptation.recommendations[0];
  const command = getProgramStatusCommand(adaptation, routineDecision);
  const bottleneck = adaptation.recovery.bottleneck;
  const guardrail = adaptation.targetDateGuardrail.warning;
  const detailReason = guardrail
    ?? recommendation.blockedConstraints[0]
    ?? recommendation.reason
    ?? (bottleneck ? `Bottleneck: ${bottleneck.muscle.replace('_', ' ')}` : null);
  const loadChange = recommendation.fatigueCost > 0
    ? `+${recommendation.fatigueCost}`
    : recommendation.fatigueCost.toString();

  return (
    <WatchSignalPanel
      label={command.label}
      title={command.title}
      summary={command.summary}
      action={command.action}
      tone={command.tone}
      active
    >
      <div className="rounded-lg border border-white/5 bg-black/25 px-3 py-2">
        <p className="text-fluid-label font-mono uppercase text-white/30">{command.routineTitle}</p>
        <p className="mt-1 text-fluid-label font-mono uppercase leading-relaxed text-white/55">{command.routineSummary}</p>
        <p className="mt-2 text-fluid-label font-mono uppercase leading-relaxed text-white/35">{command.routineAction}</p>
      </div>
      <WatchDetailsPanel summary="Details" className="mt-3">
        <WatchMetricGrid columns={2}>
          <WatchMetricCell label="Program score" value={adaptation.objectiveScore.toFixed(1)} />
          <WatchMetricCell label="Recovery" value={`${Math.round(recommendation.recoveryState * 100)}%`} />
          <WatchMetricCell label="Load change" value={loadChange} tone={recommendation.fatigueCost < 0 ? command.tone : 'text-white/75'} />
          <WatchMetricCell label="Risk" value={`${Math.round(adaptation.fatigue.jointRisk * 100)}%`} />
        </WatchMetricGrid>
        {detailReason && (
          <p className="mt-3 text-fluid-label font-mono uppercase leading-relaxed text-white/35">
            {detailReason}
          </p>
        )}
      </WatchDetailsPanel>
    </WatchSignalPanel>
  );
}
