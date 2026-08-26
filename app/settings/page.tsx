'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bug } from 'lucide-react';
import { loadUserProfile } from '@/lib/storage';
import { getRoutine } from '@/lib/routines';
import { TopBar } from '@/components/TopBar';
import { WatchBackButton, WatchListItem, WatchScreen, WatchSwitchItem } from '@/components/WatchSurface';
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
    <WatchScreen
      top={(
        <TopBar
          leftAction={<WatchBackButton href="/" />}
          center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Settings</span>}
        />
      )}
      bodyClassName="pt-2 flex flex-col gap-2"
    >
      <WatchListItem
        onClick={() => router.push('/settings/routine')}
        label="Routine"
        title={routineName}
      />

      <WatchListItem
        onClick={() => router.push('/settings/sync')}
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
    </WatchScreen>
  );
}
