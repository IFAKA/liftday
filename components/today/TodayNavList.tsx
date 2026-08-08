'use client';

import { CalendarDays, ChartBar, Settings } from 'lucide-react';
import { WatchListItem } from '@/components/WatchSurface';

export function TodayNavList() {
  return (
    <nav aria-label="Main sections" className="flex flex-col gap-2">
      <WatchListItem href="/program" icon={CalendarDays} title="Program" subtle className="py-3" />
      <WatchListItem href="/progress" icon={ChartBar} title="Progress" subtle className="py-3" />
      <WatchListItem href="/settings" icon={Settings} title="Settings" subtle className="py-3" />
    </nav>
  );
}
