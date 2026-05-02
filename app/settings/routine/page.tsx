'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadUserProfile, setActiveRoutine } from '@/lib/storage';
import { ROUTINES } from '@/lib/routines';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Dumbbell, PersonStanding } from 'lucide-react';
import { WatchListItem } from '@/components/WatchSurface';

const ICONS = {
  dumbbell: Dumbbell,
  'person-standing': PersonStanding,
} as const;

export default function RoutineSettingPage() {
  const router = useRouter();
  const [activeRoutineId, setActiveRoutineId] = useState(() => {
    if (typeof window === 'undefined') return 'calisthenics';
    return loadUserProfile()?.activeRoutine ?? 'calisthenics';
  });

  function handleSelect(id: string) {
    setActiveRoutineId(id);
    setActiveRoutine(id);
    router.back();
  }

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      <TopBar
        leftAction={
          <Button variant="ghost" size="icon-xl" onClick={() => router.back()} className="-ml-2 text-white/60 hover:text-white hover:bg-transparent active:text-white">
            <ArrowLeft className="icon-lg" />
          </Button>
        }
        center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Routine</span>}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 no-scrollbar mt-2 flex flex-col gap-3">
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
      </div>
    </div>
  );
}
