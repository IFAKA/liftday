'use client';

import Link from 'next/link';
import { ReactNode, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { WeeklySplit } from '@/components/WeeklySplit';
import { loadUserProfile, loadWorkoutData } from '@/lib/storage';
import { getRoutine } from '@/lib/routines';
import { RoutineConfig, WorkoutData } from '@/lib/types';
import { TopBar } from '@/components/TopBar';

export default function ProgramPage() {
  const [{ data, routine }] = useState<{
    data: WorkoutData;
    routine: RoutineConfig | null;
  }>(() => {
    if (typeof window === 'undefined') {
      return { data: {}, routine: null };
    }

    const profile = loadUserProfile();
    const routine = getRoutine(profile?.activeRoutine ?? 'calisthenics');
    const data = loadWorkoutData();

    return {
      data,
      routine,
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

        <ProgramBlock title="Week">
          <WeeklySplit currentDate={new Date()} data={data} embedded />
        </ProgramBlock>
      </div>
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
