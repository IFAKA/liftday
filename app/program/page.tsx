'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { WeeklySplit } from '@/components/WeeklySplit';
import { RoutineConfig, WorkoutData } from '@/lib/types';
import { TopBar } from '@/components/TopBar';
import { RoutineAdjustmentDecision } from '@/lib/progress-insights';
import { cn } from '@/lib/utils';
import { loadProgramSummary } from '@/lib/program-summary';
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

    const summary = loadProgramSummary();

    return {
      data: summary.data,
      routine: summary.routine,
      routineDecision: summary.routineDecision,
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
        {routine && (
          <WatchSection title="Program">
            <WatchListItem
              href="/program/detail"
              label="Routine"
              title={routine.name}
              subtitle="Exercises, efficiency, muscle volume"
            />
          </WatchSection>
        )}

        {routineDecision && (
          <WatchSection title="Now">
            <RoutineDecisionPanel decision={routineDecision} />
          </WatchSection>
        )}

        <WatchSection title="Week">
          <WeeklySplit currentDate={new Date()} data={data} embedded />
        </WatchSection>
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
