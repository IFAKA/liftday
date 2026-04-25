'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadUserProfile, setActiveRoutine } from '@/lib/storage';
import { ROUTINES } from '@/lib/routines';
import { TopBar } from '@/components/TopBar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Dumbbell, PersonStanding } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = {
  dumbbell: Dumbbell,
  'person-standing': PersonStanding,
} as const;

export default function RoutineSettingPage() {
  const router = useRouter();
  const [activeRoutineId, setActiveRoutineId] = useState('calisthenics');

  useEffect(() => {
    const profile = loadUserProfile();
    setActiveRoutineId(profile?.activeRoutine ?? 'calisthenics');
  }, []);

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
            <button
              key={id}
              onClick={() => handleSelect(id)}
              className={cn(
                'w-full text-left flex items-start gap-4 px-5 py-5 rounded-2xl border transition-all',
                isActive
                  ? 'bg-white/15 border-white/30 ring-2 ring-white/20'
                  : 'bg-white/5 border-white/5 active:bg-white/10'
              )}
            >
              <div className={cn('mt-0.5 shrink-0', isActive ? 'text-white' : 'text-white/30')}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <span className={cn('text-fluid-ui font-black uppercase tracking-tight', isActive ? 'text-white' : 'text-white/40')}>
                  {name}
                </span>
                <span className="text-fluid-label text-white/40 font-mono leading-relaxed">
                  {description}
                </span>
              </div>
              {isActive && (
                <div className="shrink-0 w-2 h-2 rounded-full bg-white mt-2 ml-auto" />
              )}
            </button>
          );
        })}

        <p className="text-fluid-label text-white/20 font-mono mt-4 leading-relaxed px-1">
          Switching routines preserves all progress. Tiers are tracked independently per routine.
        </p>
      </div>
    </div>
  );
}
