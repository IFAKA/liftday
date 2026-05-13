'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bug, ChevronLeft } from 'lucide-react';
import { loadUserProfile } from '@/lib/storage';
import { REST_DURATION } from '@/lib/constants';
import { getRoutine } from '@/lib/routines';
import { TopBar } from '@/components/TopBar';
import { WatchListItem, WatchSwitchItem } from '@/components/WatchSurface';
import { isDebugTraceEnabled, setDebugTraceEnabled } from '@/lib/debug-trace';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const router = useRouter();
  const [debugEnabled, setDebugEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return isDebugTraceEnabled();
  });
  const [{ restDuration, heightCm, weightKg, routineName }] = useState(() => {
    if (typeof window === 'undefined') {
      return { restDuration: REST_DURATION, heightCm: 172, weightKg: 66.6, routineName: 'Gym' };
    }
    const profile = loadUserProfile();
    const routine = getRoutine(profile?.activeRoutine ?? 'gym');
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

  function setDebugMode(next: boolean) {
    setDebugTraceEnabled(next);
    setDebugEnabled(next);
  }

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      <TopBar
        leftAction={
          <Button variant="ghost" size="icon" aria-label="Back" onClick={() => router.push('/program')} className="-ml-2 text-white/50 hover:text-white hover:bg-transparent active:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        }
        center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Options</span>}
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

        <WatchSwitchItem
          id="debug-trace-mode"
          icon={Bug}
          checked={debugEnabled}
          onCheckedChange={setDebugMode}
          label="Debug"
          title="Trace mode"
          subtitle="Show a small copy button for user-flow traces."
        />
      </div>
    </div>
  );
}
