'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bug } from 'lucide-react';
import { loadUserProfile } from '@/lib/storage';
import { REST_DURATION } from '@/lib/constants';
import { getRoutine } from '@/lib/routines';
import { TopBar } from '@/components/TopBar';
import { WatchListItem } from '@/components/WatchSurface';
import { isDebugTraceEnabled, setDebugTraceEnabled } from '@/lib/debug-trace';

export default function SettingsPage() {
  const router = useRouter();
  const [debugEnabled, setDebugEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return isDebugTraceEnabled();
  });
  const [{ restDuration, heightCm, weightKg, routineName }] = useState(() => {
    if (typeof window === 'undefined') {
      return { restDuration: REST_DURATION, heightCm: 172, weightKg: 66.6, routineName: 'Calisthenics' };
    }
    const profile = loadUserProfile();
    const routine = getRoutine(profile?.activeRoutine ?? 'calisthenics');
    return {
      restDuration: profile?.restDuration ?? REST_DURATION,
      heightCm: profile?.heightCm ?? 172,
      weightKg: profile?.weightKg ?? 66.6,
      routineName: routine.name,
    };
  });

  const mins = Math.floor(restDuration / 60);
  const secs = restDuration % 60;
  const restDisplay = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;

  function toggleDebugMode() {
    setDebugEnabled((prev) => {
      const next = !prev;
      setDebugTraceEnabled(next);
      return next;
    });
  }

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      <TopBar
        center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Settings</span>}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 no-scrollbar mt-2 flex flex-col gap-2">
        <WatchListItem
          onClick={() => router.push('/settings/routine')}
          label="Routine"
          title={routineName}
        />

        <WatchListItem
          onClick={() => router.push('/settings/rest')}
          label="Rest"
          title={restDisplay}
        />

        <WatchListItem
          onClick={() => router.push('/settings/body')}
          label="Body & goal"
          title={`${heightCm}cm · ${weightKg}kg`}
        />

        <WatchListItem
          onClick={() => router.push('/sync')}
          label="Sync"
          title="Phone to laptop"
        />

        <WatchListItem
          onClick={toggleDebugMode}
          icon={Bug}
          label="Debug"
          title="Trace mode"
          subtitle="Show a small copy button for user-flow traces."
          trailing={
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                debugEnabled ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-white/35'
              }`}
            >
              {debugEnabled ? 'On' : 'Off'}
            </span>
          }
        />
      </div>
    </div>
  );
}
