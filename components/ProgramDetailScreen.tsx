'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/TopBar';
import { cn } from '@/lib/utils';
import { getChainsForRoutine, getProgressionPath, resolveExerciseKey } from '@/lib/tiers';
import { RoutineConfig, UserProfile, WorkoutType } from '@/lib/types';
import { formatCadence, formatRoutineForCopy, getExerciseName } from '@/lib/routine-format';
import { getChainSetCount } from '@/lib/routine-plan';
import { loadProgramSummary } from '@/lib/program-summary';
import {
  WatchCopyButton,
  WatchPanel,
  WatchSection,
} from './WatchSurface';
import { formatWorkoutType, getWorkoutTypeTone } from '@/lib/schedule';

export function ProgramDetailScreen() {
  const router = useRouter();
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
    <div className="flex flex-col h-full bg-black overflow-hidden">
      <TopBar
        leftAction={
          <Button variant="ghost" size="icon" aria-label="Back" onClick={() => router.push('/program')} className="-ml-2 size-11 text-white/50 hover:text-white hover:bg-transparent active:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        }
        center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Routine</span>}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-2 no-scrollbar select-text flex flex-col gap-5">
        {routine && (
          <WatchSection title="Exercises">
            <RoutineSlots routine={routine} profile={profile} fallbackSets={setsPerExercise} />
          </WatchSection>
        )}

        <WatchCopyButton copied={copied} onClick={handleCopyRoutine} label="Copy Routine" />
      </div>
    </div>
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
