'use client';

import { useState, useEffect } from 'react';
import { loadUserProfile, setActiveRoutine, setRestDuration } from '@/lib/storage';
import { ROUTINES } from '@/lib/routines';
import { REST_DURATION } from '@/lib/constants';
import { TopBar } from '@/components/TopBar';
import { cn } from '@/lib/utils';
import { Dumbbell, PersonStanding } from 'lucide-react';

const ICONS = {
  dumbbell: Dumbbell,
  'person-standing': PersonStanding,
} as const;

const REST_STEP = 15;
const REST_MIN = 30;
const REST_MAX = 300;

export default function ProfilePage() {
  const [activeRoutineId, setActiveRoutineId] = useState('calisthenics');
  const [restDuration, setRestDurationState] = useState(REST_DURATION);

  useEffect(() => {
    const profile = loadUserProfile();
    setActiveRoutineId(profile?.activeRoutine ?? 'calisthenics');
    setRestDurationState(profile?.restDuration ?? REST_DURATION);
  }, []);

  function handleSelect(id: string) {
    setActiveRoutineId(id);
    setActiveRoutine(id);
  }

  function handleRestAdjust(delta: number) {
    setRestDurationState((prev) => {
      const next = Math.min(REST_MAX, Math.max(REST_MIN, prev + delta));
      setRestDuration(next);
      return next;
    });
  }

  const restMins = Math.floor(restDuration / 60);
  const restSecs = restDuration % 60;
  const restDisplay = restMins > 0
    ? `${restMins}:${restSecs.toString().padStart(2, '0')}`
    : `${restSecs}s`;

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
        </div>

        <p className="text-fluid-label text-white/20 font-mono mt-8 leading-relaxed">
          Switching routines preserves all progress. Your tiers are tracked independently per routine.
        </p>

        <p className="text-fluid-label text-white/40 font-mono uppercase tracking-widest mt-10 mb-4">
          Rest Duration
        </p>

        <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/5 border border-white/5">
          <button
            onClick={() => handleRestAdjust(-REST_STEP)}
            disabled={restDuration <= REST_MIN}
            className="w-10 h-10 rounded-full bg-white/10 text-white font-black text-lg flex items-center justify-center active:bg-white/20 disabled:opacity-20 disabled:pointer-events-none transition-all"
          >
            −
          </button>
          <span className="flex-1 text-center font-mono font-black text-fluid-timer text-white tabular-nums">
            {restDisplay}
          </span>
          <button
            onClick={() => handleRestAdjust(REST_STEP)}
            disabled={restDuration >= REST_MAX}
            className="w-10 h-10 rounded-full bg-white/10 text-white font-black text-lg flex items-center justify-center active:bg-white/20 disabled:opacity-20 disabled:pointer-events-none transition-all"
          >
            +
          </button>
        </div>

        <p className="text-fluid-label text-white/20 font-mono mt-3 leading-relaxed">
          Default rest between sets. Adjusts in {REST_STEP}s steps.
        </p>
      </div>
    </div>
  );
}
