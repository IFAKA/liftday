'use client';

import { Activity, CalendarDays, ChartBar, CheckCircle, Flame, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  WatchAlertPanel,
  WatchListItem,
  WatchPanel,
  WatchPrimaryAction,
} from '@/components/WatchSurface';
import { formatDisplayDate } from '@/lib/workout-utils';
import { TopBar } from '../TopBar';

export function TodayHub({
  date,
  isDone,
  workoutTitle,
  streak,
  storageReady,
  nextExerciseName,
  nextPrescription,
  storageIssueMessage,
  startError,
  onStart,
}: {
  date: Date;
  isDone: boolean;
  workoutTitle: string;
  streak: number;
  storageReady: boolean;
  nextExerciseName?: string;
  nextPrescription?: {
    sets: number;
    minReps: number;
    maxReps: number;
    targetRir: string;
  } | null;
  storageIssueMessage: string | null;
  startError: string | null;
  onStart: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-black">
      <TopBar
        center={
          <span className="text-fluid-label font-mono font-black text-white/70 uppercase tracking-widest">
            {formatDisplayDate(date)}
          </span>
        }
      />

      <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-8">
        {isDone ? (
          <div className="flex flex-col items-center">
            <CheckCircle className="w-16 h-16 text-green-500 mb-5" />
            <h1 className="text-fluid-title font-black uppercase text-white leading-none">
              DONE
            </h1>
          </div>
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

      {storageReady && !isDone && nextExerciseName && nextPrescription && (
        <WorkoutStartPanel exerciseName={nextExerciseName} prescription={nextPrescription} />
      )}

      <TodayNavList />

      {storageReady && !isDone && (
        <>
          {storageIssueMessage && (
            <StorageIssuePanel tone="warning" message={`Storage issue. ${storageIssueMessage}`} />
          )}
          {startError && (
            <StorageIssuePanel tone="danger" message={startError} />
          )}
          <div className="w-full px-4 pb-safe mb-4 shrink-0">
            <WatchPrimaryAction onClick={onStart} className="shadow-xl">
              Start
            </WatchPrimaryAction>
          </div>
        </>
      )}
    </div>
  );
}

function WorkoutStartPanel({
  exerciseName,
  prescription,
}: {
  exerciseName: string;
  prescription: {
    sets: number;
    minReps: number;
    maxReps: number;
    targetRir: string;
  };
}) {
  return (
    <div className="w-full px-4 mb-3">
      <WatchPanel subtle className="py-3">
        <p className="text-fluid-label text-zinc-500 uppercase font-mono">Next</p>
        <p className="mt-1 truncate text-fluid-label font-black uppercase text-white">
          {exerciseName}
        </p>
        <p className="mt-1 text-fluid-label font-mono uppercase text-white/35">
          {prescription.sets}x{prescription.minReps}-{prescription.maxReps} · {prescription.targetRir}
        </p>
      </WatchPanel>
    </div>
  );
}

function TodayNavList() {
  return (
    <div className="w-full px-4 mb-3 flex flex-col gap-2">
      <WatchListItem href="/muscles" icon={Activity} title="Muscles" subtitle="What is working" subtle className="py-3" />
      <WatchListItem href="/program" icon={CalendarDays} title="Program" subtitle="Routine" subtle className="py-3" />
      <WatchListItem href="/history" icon={ChartBar} title="Progress" subtitle="Changes and attention" subtle className="py-3" />
      <WatchListItem href="/settings" icon={Settings} title="Options" subtitle="Routine, body, sync" subtle className="py-3" />
    </div>
  );
}

function StorageIssuePanel({ tone, message }: { tone: 'warning' | 'danger'; message: string }) {
  return (
    <div className="w-full px-4 mb-3">
      <WatchAlertPanel tone={tone}>
        {message}
      </WatchAlertPanel>
    </div>
  );
}
