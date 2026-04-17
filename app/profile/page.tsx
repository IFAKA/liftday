'use client';

import { useState, useEffect } from 'react';
import { loadUserProfile, setActiveRoutine } from '@/lib/storage';
import { RoutineId } from '@/lib/types';
import { TopBar } from '@/components/TopBar';
import { cn } from '@/lib/utils';
import { Dumbbell, PersonStanding } from 'lucide-react';

const ROUTINES: { id: RoutineId; label: string; description: string }[] = [
  {
    id: 'calisthenics',
    label: 'Calisthenics + TRX',
    description: 'Bodyweight progression at a calisthenics park. Pull-up negatives, TRX rows, push-ups, dips, pistol squats.',
  },
  {
    id: 'gym',
    label: 'Gym',
    description: 'Free weights and machines. Bench press, barbell squat, deadlift, lat pulldown, cable work.',
  },
];

export default function ProfilePage() {
  const [activeRoutine, setActiveRoutineState] = useState<RoutineId>('calisthenics');

  useEffect(() => {
    const profile = loadUserProfile();
    setActiveRoutineState(profile?.activeRoutine ?? 'calisthenics');
  }, []);

  function handleSelect(id: RoutineId) {
    setActiveRoutineState(id);
    setActiveRoutine(id);
  }

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      <TopBar
        center={
          <span className="text-fluid-ui font-black uppercase tracking-tight text-white">Profile</span>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 no-scrollbar mt-2">
        <p className="text-fluid-label text-white/40 font-mono uppercase tracking-widest mb-6">
          Active Routine
        </p>

        <div className="flex flex-col gap-3">
          {ROUTINES.map(({ id, label, description }) => {
            const isActive = activeRoutine === id;
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
                  {id === 'gym' ? (
                    <Dumbbell className="w-5 h-5" />
                  ) : (
                    <PersonStanding className="w-5 h-5" />
                  )}
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className={cn('text-fluid-ui font-black uppercase tracking-tight', isActive ? 'text-white' : 'text-white/40')}>
                    {label}
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
        </div>

        <p className="text-fluid-label text-white/20 font-mono mt-8 leading-relaxed">
          Switching routines preserves all progress. Your calisthenics and gym tiers are tracked independently.
        </p>
      </div>
    </div>
  );
}
