'use client';

import { useEffect, useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { OptimizationContext, RoutineConfig } from '@/lib/types';
import { TopBar } from '@/components/TopBar';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';
import { RoutineAdjustmentDecision } from '@/lib/progress-insights';
import { loadProgramSummary } from '@/lib/program-summary';
import { getProgramStatusCommand } from '@/components/status-command';
import { getRoutineDays } from '@/lib/routine-days';
import { formatRoutineForCopy } from '@/lib/routine-format';
import { formatWorkoutType } from '@/lib/schedule';
import {
  WatchBackButton,
  WatchCopyButton,
  WatchDetailsPanel,
  WatchListItem,
  WatchMetricCell,
  WatchMetricGrid,
  WatchScreen,
  WatchSection,
  WatchSignalPanel,
} from '@/components/WatchSurface';

export default function ProgramPage() {
  const { copy, isCopied } = useCopyFeedback({ resetMs: 1600 });
  const [{ routine, profile, setsPerExercise, routineDecision, adaptation }, setProgramState] = useState<{
    routine: RoutineConfig | null;
    profile: ReturnType<typeof loadProgramSummary>['profile'];
    setsPerExercise: number;
    routineDecision: RoutineAdjustmentDecision | null;
    adaptation: OptimizationContext | null;
  }>({ routine: null, profile: null, setsPerExercise: 3, routineDecision: null, adaptation: null });

  useEffect(() => {
    const summary = loadProgramSummary();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgramState({
      routine: summary.routine,
      profile: summary.profile,
      setsPerExercise: summary.setsPerExercise,
      routineDecision: summary.routineDecision,
      adaptation: summary.adaptation,
    });
  }, []);

  async function handleCopyRoutine() {
    await copy('routine', formatRoutineForCopy(routine, profile, setsPerExercise));
  }

  return (
    <WatchScreen
      top={(
        <TopBar
          center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Program</span>}
          leftAction={<WatchBackButton href="/" />}
        />
      )}
      bodyClassName="px-3 select-text flex flex-col gap-3"
    >
      {adaptation && (
        <ProgramGuidancePanel adaptation={adaptation} routineDecision={routineDecision} />
      )}

      <WatchSection title="Plan">
        <div className="flex flex-col gap-2">
          {routine && (
            <>
              <div className="flex items-center gap-3 px-3 pb-1">
                <Dumbbell className="size-4 text-white/35" />
                <p className="text-fluid-label font-mono uppercase text-white/40">{routine.name}</p>
              </div>
              {getRoutineDays(routine).map((day) => (
                <WatchListItem
                  key={day.slug}
                  href={`/program/${day.slug}`}
                  title={day.name}
                  subtitle={formatWorkoutType(day.workoutType)}
                  className="py-3"
                />
              ))}
            </>
          )}
        </div>
      </WatchSection>

      <WatchCopyButton copied={isCopied('routine')} onClick={handleCopyRoutine} label="Copy Routine" />
    </WatchScreen>
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
      <WatchDetailsPanel summary="Details" className="mt-3">
        <p className="text-fluid-label font-mono uppercase text-white/30">{command.routineTitle}</p>
        <p className="mt-1 text-fluid-label font-mono uppercase leading-relaxed text-white/55">{command.routineSummary}</p>
        <p className="mt-2 text-fluid-label font-mono uppercase leading-relaxed text-white/35">{command.routineAction}</p>
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
