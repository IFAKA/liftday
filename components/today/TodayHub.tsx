'use client';

import { Activity, CalendarDays, ChartBar, CheckCircle, Flame, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  WatchAlertPanel,
  WatchListItem,
  WatchPrimaryAction,
  WatchScreen,
} from '@/components/WatchSurface';
import { formatDisplayDate } from '@/lib/workout-utils';
import { TopBar } from '../TopBar';

export function TodayHub({
  date,
  isDone,
  workoutTitle,
  streak,
  storageReady,
  storageIssueMessage,
  startError,
  onStart,
}: {
  date: Date;
  isDone: boolean;
  workoutTitle: string;
  streak: number;
  storageReady: boolean;
  storageIssueMessage: string | null;
  startError: string | null;
  onStart: () => void;
}) {
  return (
    <WatchScreen
      top={(
        <TopBar
          center={
            <span className="text-fluid-label font-mono font-black text-white/70 uppercase tracking-widest">
              {formatDisplayDate(date)}
            </span>
          }
        />
      )}
      bodyClassName="flex flex-col px-4 pb-4 sm:px-8"
      footer={(
        <>
          {storageReady && !isDone && (
            <>
              {storageIssueMessage && (
                <StorageIssuePanel tone="warning" message={`Storage issue. ${storageIssueMessage}`} />
              )}
              {startError && (
                <StorageIssuePanel tone="danger" message={startError} />
              )}
              <WatchPrimaryAction onClick={onStart} className="shadow-xl">
                Start
              </WatchPrimaryAction>
            </>
          )}
        </>
      )}
      footerClassName="mb-4 flex flex-col gap-3"
    >
      <div className="flex min-h-[min(42dvh,22rem)] shrink-0 flex-col items-center justify-center">
        {isDone ? (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mb-5" />
            <h1 className="text-fluid-title font-black uppercase text-white leading-none">
              DONE
            </h1>
          </>
        ) : (
          <>
            <h1 className="text-fluid-title font-black uppercase text-white leading-none text-center">
              {workoutTitle}
            </h1>
            {streak > 0 && (
              <Badge variant="ghost" className="mt-3 rounded-full bg-orange-500/10 border-orange-500/20 text-fluid-label font-black text-orange-500 uppercase">
                <Flame className="w-4 h-4 text-orange-500" />
                {streak} DAY STREAK
              </Badge>
            )}
          </>
        )}
      </div>

      <TodayNavList />
    </WatchScreen>
  );
}

function TodayNavList() {
  return (
    <nav aria-label="Main sections" className="flex flex-col gap-2">
      <WatchListItem href="/muscles" icon={Activity} title="Muscles" subtitle="What is working" subtle className="py-3" />
      <WatchListItem href="/program" icon={CalendarDays} title="Program" subtitle="Routine" subtle className="py-3" />
      <WatchListItem href="/history" icon={ChartBar} title="Progress" subtitle="Changes and attention" subtle className="py-3" />
      <WatchListItem href="/settings" icon={Settings} title="Options" subtitle="Routine, body, sync" subtle className="py-3" />
    </nav>
  );
}

function StorageIssuePanel({ tone, message }: { tone: 'warning' | 'danger'; message: string }) {
  return (
    <WatchAlertPanel tone={tone}>
      {message}
    </WatchAlertPanel>
  );
}
