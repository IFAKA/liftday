'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bug } from 'lucide-react';
import { loadUserProfile } from '@/lib/storage';
import { getRoutine } from '@/lib/routines';
import { TopBar } from '@/components/TopBar';
import { WatchBackButton, WatchListItem, WatchSwitchItem } from '@/components/WatchSurface';
import { isDebugTraceEnabled, setDebugTraceEnabled } from '@/lib/debug-trace';

export default function SettingsPage() {
  const router = useRouter();
  const [debugEnabled, setDebugEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return isDebugTraceEnabled();
  });
  const [routineName] = useState(() => {
    if (typeof window === 'undefined') {
      return 'Gym';
    }
    const profile = loadUserProfile();
    const routine = getRoutine(profile?.activeRoutine ?? 'gym');
    return routine.name;
  });

  function setDebugMode(next: boolean) {
    setDebugTraceEnabled(next);
    setDebugEnabled(next);
  }

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      <TopBar
        leftAction={<WatchBackButton fallbackHref="/" />}
        center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Options</span>}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 no-scrollbar mt-2 flex flex-col gap-2">
        <WatchListItem
          onClick={() => router.push('/settings/routine')}
          label="Routine"
          title={routineName}
        />

        <WatchListItem
          onClick={() => router.push('/history/body')}
          title="Body"
          subtitle="Weight, measurements"
        />

        <WatchListItem
          onClick={() => router.push('/sync')}
          label="Backup"
          title="Sync & export"
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
