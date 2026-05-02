'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
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
import { WatchListItem, WatchPanel, WatchSection } from '@/components/WatchSurface';

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
          <WatchListItem
            href="/settings/routine"
            label="Routine"
            title={routine.name}
          />
        )}

        <WatchListItem
          href="/program/detail"
          label="Diagnostics"
          title="Training Detail"
          subtle
        />

        {routineDecision && (
          <WatchSection title="Now">
            <RoutineDecisionPanel decision={routineDecision} />
          </WatchSection>
        )}

        <WatchSection title="Week">
          <WeeklySplit currentDate={new Date()} data={data} embedded />
        </WatchSection>

        <WatchListItem
          href="/settings"
          icon={Settings}
          label="App"
          title="Settings"
          subtle
        />
      </div>
    </div>
  );
}

function RoutineDecisionPanel({ decision }: { decision: RoutineAdjustmentDecision }) {
  return (
    <WatchPanel>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={cn('text-fluid-label font-mono uppercase', decision.tone)}>
            {decision.label}
          </p>
          <p className="mt-1 text-fluid-ui font-black uppercase leading-tight text-white">
            {decision.summary}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-xs font-black uppercase text-white/45">
          Auto
        </span>
      </div>
      <p className="mt-3 text-fluid-label font-mono uppercase text-white/50">
        {decision.nextAction}
      </p>
    </WatchPanel>
  );
}
