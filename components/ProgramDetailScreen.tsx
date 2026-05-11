'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/TopBar';
import { cn } from '@/lib/utils';
import { RoutineScoreResult } from '@/lib/smv';
import { getChainsForRoutine, getProgressionPath, resolveExerciseKey } from '@/lib/tiers';
import { RoutineConfig, UserProfile, WorkoutType } from '@/lib/types';
import { formatCadence, formatRoutineForCopy, getExerciseName } from '@/lib/routine-format';
import { getChainSetCount } from '@/lib/routine-plan';
import { FrontierOptimizerResult } from '@/lib/frontier-optimizer';
import { loadProgramSummary } from '@/lib/program-summary';
import {
  WatchBarRow,
  WatchCopyButton,
  WatchMetricCell,
  WatchMetricGrid,
  WatchPanel,
  WatchSection,
  WatchSignalPanel,
} from './WatchSurface';
import { formatWorkoutType } from '@/lib/schedule';

export function ProgramDetailScreen() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [{ smvScore, routine, profile, setsPerExercise, optimizer }, setProgramDetail] = useState<{
    smvScore: RoutineScoreResult | null;
    routine: RoutineConfig | null;
    profile: UserProfile | null;
    setsPerExercise: number;
    optimizer: FrontierOptimizerResult | null;
  }>({ smvScore: null, routine: null, profile: null, setsPerExercise: 3, optimizer: null });

  useEffect(() => {
    const summary = loadProgramSummary();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgramDetail({
      smvScore: summary.optimizer.score,
      routine: summary.routine,
      profile: summary.profile,
      setsPerExercise: summary.setsPerExercise,
      optimizer: summary.optimizer,
    });
  }, []);

  async function handleCopyRoutine() {
    await copyText(formatRoutineForCopy(routine, profile, setsPerExercise));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      <TopBar
        leftAction={
          <Button variant="ghost" size="icon" aria-label="Back" onClick={() => router.push('/program')} className="-ml-2 size-11 text-white/50 hover:text-white hover:bg-transparent active:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        }
        center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Program Detail</span>}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-2 no-scrollbar select-text flex flex-col gap-5">
        {smvScore && (
          <WatchSection title="Efficiency">
            <SmvOverview score={smvScore} verdict={getSmvVerdict(smvScore)} optimizer={optimizer} />
          </WatchSection>
        )}

        {routine && (
          <WatchSection title="Exercises">
            <RoutineSlots routine={routine} profile={profile} fallbackSets={setsPerExercise} />
          </WatchSection>
        )}

        {smvScore && (
          <WatchSection title="Volume">
            <MuscleVolumeList score={smvScore} />
          </WatchSection>
        )}

        <WatchCopyButton copied={copied} onClick={handleCopyRoutine} label="Copy Routine" />
      </div>
    </div>
  );
}

function SmvOverview({
  score,
  verdict,
  optimizer,
}: {
  score: RoutineScoreResult;
  verdict: { label: string; summary: string; nextAction: string; tone: string };
  optimizer: FrontierOptimizerResult | null;
}) {
  const delta = optimizer ? optimizer.score.total - optimizer.baseScore.total : null;

  return (
    <WatchSignalPanel
      label={verdict.label}
      title={verdict.summary}
      action={verdict.nextAction}
      metric={formatOneDecimal(score.total)}
      metricLabel={`${formatOneDecimal(score.efficiency)}/set`}
      tone={verdict.tone}
    >
      <WatchMetricGrid>
        <WatchMetricCell label="Sets" value={formatOneDecimal(score.cost.totalSets)} />
        <WatchMetricCell label="Moves" value={formatOneDecimal(score.cost.equipmentChanges)} />
        <WatchMetricCell label={score.penalty > 0 ? 'Penalty' : 'Cost'} value={score.penalty > 0 ? `-${formatOneDecimal(score.penalty)}` : formatOneDecimal(score.cost.total)} />
      </WatchMetricGrid>
      {optimizer && (
        <div className="mt-4 border-t border-white/5 pt-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-fluid-label font-mono uppercase text-green-400">Picked</p>
            <span className="text-fluid-label font-mono tabular-nums text-white/40">
              {delta !== null && `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {optimizer.reasons.slice(0, 2).map((reason) => (
              <p key={reason} className="text-fluid-label font-mono uppercase leading-relaxed text-white/35">
                Why: {reason}
              </p>
            ))}
          </div>
        </div>
      )}
    </WatchSignalPanel>
  );
}

function RoutineSlots({ routine, profile, fallbackSets }: { routine: RoutineConfig; profile: UserProfile | null; fallbackSets: number }) {
  const tiers = profile?.tiers ?? {};

  return (
    <div className="flex flex-col gap-3">
      {(routine.schedule as Exclude<WorkoutType, 'rest'>[]).map((workoutType, dayIndex) => {
        const chains = getChainsForRoutine(routine, workoutType);
        if (chains.length === 0) return null;

        return (
          <WatchPanel key={`${workoutType}-${dayIndex}`} subtle>
            <p className={cn('mb-3 text-fluid-label font-black uppercase', getWorkoutTone(workoutType))}>
              {formatWorkoutType(workoutType)}
            </p>
            <div className="flex flex-col gap-2">
              {chains.map((chain) => {
                const activeKey = resolveExerciseKey(chain, tiers);
                const active = getExerciseName(activeKey);
                const progression = getProgressionPath(chain).filter((key) => key !== activeKey);
                return (
                  <div key={chain.slotId} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-fluid-label font-black uppercase text-white/70">{active}</p>
                      <p className="text-xs font-mono uppercase text-white/25">
                        {[`${getChainSetCount(chain, fallbackSets)}x${chain.prescription?.minReps ?? 8}-${chain.prescription?.maxReps ?? 12}`, chain.prescription?.targetRir, chain.prescription?.restLabel, formatCadence(chain.cadence)].filter(Boolean).join(' - ')}
                      </p>
                      {progression.length > 0 && (
                        <p className="truncate text-xs font-mono uppercase text-white/20">
                          Next {getExerciseName(progression[0])}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-fluid-label font-mono tabular-nums text-white/30">
                      {getChainSetCount(chain, fallbackSets)}x
                    </span>
                  </div>
                );
              })}
            </div>
          </WatchPanel>
        );
      })}
    </div>
  );
}

function MuscleVolumeList({ score }: { score: RoutineScoreResult }) {
  const muscles = Object.entries(score.breakdown)
    .filter(([, v]) => v.sets > 0 || v.penalty > 0)
    .sort(([, a], [, b]) => b.net - a.net);

  return (
    <WatchPanel subtle>
      <div className="flex flex-col gap-2">
        {muscles.map(([muscle, v]) => {
          const max = score.gross > 0 ? score.gross : 1;
          const barWidth = Math.max(4, Math.round((v.gross / max) * 100));
          const hasPenalty = v.penalty > 0;
          return (
            <WatchBarRow
              key={muscle}
              label={muscle.replace('_', ' ')}
              percent={barWidth}
              tone={hasPenalty ? 'bg-red-400' : 'bg-white/40'}
              value={<span className={hasPenalty ? 'text-red-400' : undefined}>{formatOneDecimal(v.net)}</span>}
              meta={`${formatSetCount(v.sets)}/${v.target}`}
            />
          );
        })}
      </div>
    </WatchPanel>
  );
}

function getSmvVerdict(score: RoutineScoreResult): { label: string; summary: string; nextAction: string; tone: string } {
  const lats = score.breakdown.lats;
  const sideDelt = score.breakdown.side_delt;
  const vTaperDeficit = (lats && lats.sets < lats.target) || (sideDelt && sideDelt.sets < sideDelt.target);
  const highVolume = score.cost.longSessionSets > 0 || score.cost.totalSets > 126;
  const highFriction = score.cost.equipmentChanges > 24;

  if (vTaperDeficit) {
    return {
      label: 'Needs tuning',
      summary: 'V-taper muscles are under target.',
      nextAction: 'Prioritize lats and side delts before adding chest or legs.',
      tone: 'text-yellow-400',
    };
  }

  if (highVolume || highFriction) {
    return {
      label: 'Good but costly',
      summary: highVolume ? 'The routine has high weekly volume.' : 'The routine has too many station changes.',
      nextAction: 'Keep the score, but trim low-priority sets if workouts feel long.',
      tone: 'text-yellow-400',
    };
  }

  return {
    label: 'Efficient',
    summary: 'Priority muscles are covered without excess cost.',
    nextAction: 'Keep progressing the current routine.',
    tone: 'text-green-400',
  };
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back for browsers that expose the API but reject without a secure context.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function getWorkoutTone(workoutType: string): string {
  if (workoutType.startsWith('push')) return 'text-orange-400';
  if (workoutType.startsWith('pull')) return 'text-blue-400';
  if (workoutType === 'delts_arms') return 'text-pink-300';
  return 'text-green-400';
}

function formatOneDecimal(value: number): string {
  return value.toFixed(1);
}

function formatSetCount(value: number): string {
  const roundedUp = Math.ceil(value * 10) / 10;
  return roundedUp.toFixed(1);
}
