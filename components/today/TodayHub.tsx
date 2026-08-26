'use client';

import { CheckCircle } from 'lucide-react';
import {
  WatchAlertPanel,
  WatchScreen,
} from '@/components/WatchSurface';
import { TodayNavList } from './TodayNavList';

export function TodayHub({
  isDone,
  workoutTitle,
  storageReady,
  storageIssueMessage,
  startError,
}: {
  isDone: boolean;
  workoutTitle: string;
  storageReady: boolean;
  storageIssueMessage: string | null;
  startError: string | null;
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

function StorageIssuePanel({ tone, message }: { tone: 'warning' | 'danger'; message: string }) {
  return (
    <WatchAlertPanel tone={tone}>
      {message}
    </WatchAlertPanel>
  );
}
