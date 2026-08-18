'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TopBar } from './TopBar';
import { WatchBackButton, WatchListItem, WatchScreen, WatchSection } from './WatchSurface';
import { getRoutineDay, getRoutineDayExercises, type RoutineDay } from '@/lib/routine-days';
import { loadProgramSummary } from '@/lib/program-summary';
import type { RoutineConfig, UserProfile } from '@/lib/types';
import { getChainSetCount } from '@/lib/routine-plan';

export function RoutineDayScreen() {
  const { day: dayParam } = useParams<{ day: string }>();
  const [{ routine, profile, day }, setState] = useState<{
    routine: RoutineConfig | null;
    profile: UserProfile | null;
    day: RoutineDay | null;
  }>({ routine: null, profile: null, day: null });

  useEffect(() => {
    const summary = loadProgramSummary();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ routine: summary.routine, profile: summary.profile, day: getRoutineDay(dayParam, summary.routine) });
  }, [dayParam]);

  if (!routine || !day) {
    return <WatchScreen><p className="p-6 text-center text-fluid-label font-mono uppercase text-white/35">Day not found.</p></WatchScreen>;
  }

  const exercises = getRoutineDayExercises(routine, day, profile);
  return (
    <WatchScreen
      top={<TopBar leftAction={<WatchBackButton fallbackHref="/program" />} center={<div className="text-center"><p className="text-fluid-ui font-black uppercase text-white">{day.name}</p><p className="text-fluid-label font-mono uppercase text-white/40">{day.label}</p></div>} />}
      bodyClassName="pt-2 flex flex-col gap-4"
    >
      <WatchSection title="Exercises">
        <div className="flex flex-col gap-1">
          {exercises.map(({ exercise, chain }) => {
            const prescription = chain.prescription;
            const detail = `${getChainSetCount(chain, 3)}x${prescription?.minReps ?? 8}-${prescription?.maxReps ?? 12} · ${prescription?.targetRir ?? '1-2 RIR'}`;
            const groupLabel = chain.supersetGroup ? ' · Superset' : chain.equipmentBlockGroup ? ' · Same station' : '';
            return (
              <WatchListItem
                key={chain.slotId}
                href={`/exercises/${exercise.key}?day=${day.slug}`}
                title={exercise.name}
                subtitle={`${detail}${groupLabel}`}
                className="py-3"
              />
            );
          })}
        </div>
      </WatchSection>
    </WatchScreen>
  );
}
