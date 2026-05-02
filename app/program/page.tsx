'use client';

import Link from 'next/link';
import { ReactNode, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { WeeklySplit } from '@/components/WeeklySplit';
import { getFirstSessionDate, loadUserProfile, loadWorkoutData } from '@/lib/storage';
import { getRoutine } from '@/lib/routines';
import { RoutineConfig, WorkoutData } from '@/lib/types';
import { TopBar } from '@/components/TopBar';
import { EXERCISES } from '@/lib/constants';
import { getProgressDiagnosis, getProgressSignal, getRoutineAdjustmentDecision, RoutineAdjustmentDecision } from '@/lib/progress-insights';
import { scoreRoutine } from '@/lib/routine-score';
import { resolveExerciseKey } from '@/lib/tiers';
import { cn } from '@/lib/utils';
import { getSetsForWeek, getWeekNumber } from '@/lib/workout-utils';

export default function ProgramPage() {
  const [{ data, routine, routineDecision }] = useState<{
    data: WorkoutData;
    routine: RoutineConfig | null;
    routineDecision: RoutineAdjustmentDecision | null;
  }>(() => {
    if (typeof window === 'undefined') {
      return { data: {}, routine: null, routineDecision: null };
    }

    const today = new Date();
    const profile = loadUserProfile();
    const routine = getRoutine(profile?.activeRoutine ?? 'calisthenics');
    const data = loadWorkoutData();
    const tiers = profile?.tiers ?? {};
    const weekNumber = getWeekNumber(getFirstSessionDate(), today);
    const setsPerExercise = getSetsForWeek(weekNumber, profile?.setsPerExercise);
    const weeklyExercises = routine.tierChains
      .map((chain) => EXERCISES.find((exercise) => exercise.key === resolveExerciseKey(chain, tiers)))
      .filter((exercise): exercise is (typeof EXERCISES)[number] => Boolean(exercise));
    const score = scoreRoutine(routine, { tiers, setsPerExercise });
    const signal = getProgressSignal(data, weeklyExercises);
    const diagnosis = getProgressDiagnosis(data, weeklyExercises, score);

    return {
      data,
      routine,
      routineDecision: getRoutineAdjustmentDecision(data, diagnosis, score, signal),
    };
  });

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      <TopBar
        center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Program</span>}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-2 no-scrollbar select-text flex flex-col gap-2">
        {routine && (
          <Link
            href="/settings/routine"
            className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/5 px-5 py-5 active:bg-white/10 transition-all"
          >
            <div className="min-w-0 flex-1">
              <p className="text-fluid-label font-mono uppercase tracking-widest text-white/40">Routine</p>
              <p className="mt-1 truncate text-fluid-ui font-black uppercase tracking-tight text-white">{routine.name}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
          </Link>
        )}

        <Link
          href="/program/detail"
          className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] px-5 py-5 active:bg-white/10 transition-all"
        >
          <div className="min-w-0 flex-1">
            <p className="text-fluid-label font-mono uppercase tracking-widest text-white/40">Diagnostics</p>
            <p className="mt-1 truncate text-fluid-ui font-black uppercase tracking-tight text-white">Training Detail</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />
        </Link>

        {routineDecision && (
          <ProgramBlock title="Coach">
            <RoutineDecisionPanel decision={routineDecision} />
          </ProgramBlock>
        )}

        <ProgramBlock title="Week">
          <WeeklySplit currentDate={new Date()} data={data} embedded />
        </ProgramBlock>
      </div>
    </div>
  );
}

function RoutineDecisionPanel({ decision }: { decision: RoutineAdjustmentDecision }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={cn('text-fluid-label font-mono uppercase tracking-widest', decision.tone)}>
            {decision.label}
          </p>
          <p className="mt-1 text-fluid-ui font-black uppercase tracking-tight leading-tight text-white">
            {decision.summary}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/45">
          Auto
        </span>
      </div>
      <p className="mt-4 text-fluid-label font-mono uppercase tracking-wide text-white/50">
        {decision.nextAction}
      </p>
      <p className="mt-3 text-[10px] font-mono uppercase tracking-widest text-white/30">
        {decision.automation}
      </p>
    </div>
  );
}

function ProgramBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 px-1">
        <span className="text-fluid-label font-black uppercase tracking-widest text-white/40">{title}</span>
      </div>
      {children}
    </section>
  );
}
