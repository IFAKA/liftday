'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { copyText } from '@/lib/clipboard';
import { cn } from '@/lib/utils';
import { getChainsForRoutine, getProgressionPath, resolveExerciseKey } from '@/lib/tiers';
import { RoutineConfig, UserProfile, WorkoutType } from '@/lib/types';
import { formatCadence, formatRoutineForCopy, getExerciseName } from '@/lib/routine-format';
import { getChainSetCount } from '@/lib/routine-plan';
import { loadProgramSummary } from '@/lib/program-summary';
import {
  WatchBackButton,
  WatchCopyButton,
  WatchPanel,
  WatchScreen,
  WatchSection,
} from './WatchSurface';
import { formatWorkoutType, getWorkoutTypeTone } from '@/lib/schedule';

export function ProgramDetailScreen() {
  const [copied, setCopied] = useState(false);
  const [{ routine, profile, setsPerExercise }, setProgramDetail] = useState<{
    routine: RoutineConfig | null;
    profile: UserProfile | null;
    setsPerExercise: number;
  }>({ routine: null, profile: null, setsPerExercise: 3 });

  useEffect(() => {
    const summary = loadProgramSummary();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgramDetail({
      routine: summary.routine,
      profile: summary.profile,
      setsPerExercise: summary.setsPerExercise,
    });
  }, []);

  async function handleCopyRoutine() {
    await copyText(formatRoutineForCopy(routine, profile, setsPerExercise));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <WatchScreen
      top={(
        <TopBar
          leftAction={<WatchBackButton fallbackHref="/program" />}
          center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Routine</span>}
        />
      )}
      bodyClassName="pt-2 select-text flex flex-col gap-5"
    >
      {routine && (
        <WatchSection title="Exercises">
          <RoutineSlots routine={routine} profile={profile} fallbackSets={setsPerExercise} />
        </WatchSection>
      )}

      <WatchCopyButton copied={copied} onClick={handleCopyRoutine} label="Copy Routine" />
    </WatchScreen>
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
            <p className={cn('mb-3 text-fluid-label font-black uppercase', getWorkoutTypeTone(workoutType))}>
              {formatWorkoutType(workoutType)}
            </p>
            <div className="flex flex-col gap-2">
              {chains.map((chain) => {
                const activeKey = resolveExerciseKey(chain, tiers);
                const active = getExerciseName(activeKey);
                const progression = getProgressionPath(chain).filter((key) => key !== activeKey);
                return (
                  <Link
                    key={chain.slotId}
                    href={`/exercises/${activeKey}`}
                    className="flex min-h-12 items-center justify-between gap-3 rounded-lg px-2 py-2 active:bg-white/10"
                  >
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
                    <ChevronRight className="h-4 w-4 shrink-0 text-white/25" />
                  </Link>
                );
              })}
            </div>
          </WatchPanel>
        );
      })}
    </div>
  );
}
