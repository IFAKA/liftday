'use client';

import { CalendarDays, ChartBar, CheckCircle, Settings } from 'lucide-react';
import {
  WatchAlertPanel,
  WatchListItem,
  WatchPrimaryAction,
  WatchScreen,
} from '@/components/WatchSurface';

export function TodayHub({
  isDone,
  workoutTitle,
  storageReady,
  storageIssueMessage,
  startError,
  onStart,
}: {
  isDone: boolean;
  workoutTitle: string;
  storageReady: boolean;
  storageIssueMessage: string | null;
  startError: string | null;
  onStart: () => void;
}) {
  return (
    <WatchScreen
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
      <WatchListItem href="/program" icon={CalendarDays} title="Program" subtle className="py-3" />
      <WatchListItem href="/progress" icon={ChartBar} title="Progress" subtle className="py-3" />
      <WatchListItem href="/settings" icon={Settings} title="Settings" subtle className="py-3" />
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
