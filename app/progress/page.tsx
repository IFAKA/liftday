'use client';

import { Activity, ChartBar, Scale } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { WatchBackButton, WatchListItem, WatchScreen } from '@/components/WatchSurface';

export default function ProgressPage() {
  return (
    <WatchScreen
      top={(
        <TopBar
          leftAction={<WatchBackButton href="/" />}
          center={<span className="text-fluid-ui font-black uppercase tracking-tight text-white">Progress</span>}
        />
      )}
      bodyClassName="px-3 pt-2 flex flex-col gap-2"
    >
      <WatchListItem
        href="/history"
        icon={ChartBar}
        title="Workout history"
        subtitle="Sessions, load, and recovery"
        subtle
        className="py-3"
      />
      <WatchListItem
        href="/muscles"
        icon={Activity}
        title="Muscle map"
        subtitle="Volume by muscle group"
        subtle
        className="py-3"
      />
      <WatchListItem
        href="/history/body"
        icon={Scale}
        title="Body metrics"
        subtitle="Weight, measurements, photos"
        subtle
        className="py-3"
      />
    </WatchScreen>
  );
}
