'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadUserProfile, setActiveRoutine } from '@/lib/storage';
import { ROUTINES } from '@/lib/routines';
import { TopBar } from '@/components/TopBar';
import { Dumbbell, PersonStanding } from 'lucide-react';
import { WatchBackButton, WatchListItem, WatchScreen } from '@/components/WatchSurface';

const ICONS = {
  dumbbell: Dumbbell,
  'person-standing': PersonStanding,
} as const;

export default function RoutineSettingPage() {
  const router = useRouter();
  const [activeRoutineId, setActiveRoutineId] = useState(() => {
    if (typeof window === 'undefined') return 'gym';
    return loadUserProfile()?.activeRoutine ?? 'gym';
  });

  function handleSelect(id: string) {
    setActiveRoutineId(id);
    setActiveRoutine(id);
    router.back();
  }

  return (
    <WatchScreen
      top={(
        <TopBar
          leftAction={<WatchBackButton />}
          center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Routine</span>}
        />
      )}
      bodyClassName="pt-2 flex flex-col gap-3"
    >
      <WatchListItem
        href="/program/detail"
        label="Active plan"
        title="View routine"
        subtitle="Exercises, set counts, weekly summary, copy"
      />

      {ROUTINES.map(({ id, name, description, icon }) => {
        const isActive = activeRoutineId === id;
        const Icon = ICONS[icon];
        return (
          <WatchListItem
            key={id}
            onClick={() => handleSelect(id)}
            icon={Icon}
            title={name}
            subtitle={description}
            active={isActive}
            trailing={isActive ? <div className="h-2 w-2 shrink-0 rounded-full bg-white" /> : undefined}
          />
        );
      })}

      <p className="text-fluid-label text-white/20 font-mono mt-4 leading-relaxed px-1">
        Switching routines preserves all progress. Tiers are tracked independently per routine.
      </p>
    </WatchScreen>
  );
}
