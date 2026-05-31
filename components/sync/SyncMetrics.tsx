'use client';

import { WatchMetricCell, WatchMetricGrid, WatchStatusPill } from '@/components/WatchSurface';

interface SyncSummary {
  sessionCount: number;
  firstSessionDate: string | null;
  latestSessionDate: string | null;
  photoCount: number;
}

export function SyncMetricGrid({ summary }: { summary: SyncSummary }) {
  return (
    <WatchMetricGrid columns={2}>
      <WatchMetricCell label="Sessions" value={summary.sessionCount.toString()} />
      <WatchMetricCell label="Photos" value={summary.photoCount.toString()} />
      <WatchMetricCell label="First" value={summary.firstSessionDate ?? '-'} />
      <WatchMetricCell label="Latest" value={summary.latestSessionDate ?? '-'} />
    </WatchMetricGrid>
  );
}

export function StatusPill({ state }: { state: 'idle' | 'waiting' | 'sending' | 'done' | 'error' }) {
  const isDone = state === 'done';
  const isError = state === 'error';
  const label = isDone ? 'Done' : isError ? 'Retry' : 'Live';
  const tone = isDone ? 'success' : isError ? 'danger' : 'neutral';

  return <WatchStatusPill tone={tone}>{label}</WatchStatusPill>;
}
