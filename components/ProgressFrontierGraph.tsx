'use client';

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { ProgressDiagnosis, ProgressFrontier } from '@/lib/progress-insights';
import { cn } from '@/lib/utils';
import { WatchListItem, WatchPanel, WatchSection } from './WatchSurface';

export function ProgressFrontierGraph({
  frontier,
  diagnosis,
}: {
  frontier: ProgressFrontier;
  diagnosis: ProgressDiagnosis;
}) {
  const hasHistory = frontier.current !== null;
  const latestPoint = frontier.points.filter((point) => point.actual !== null).at(-1);

  return (
    <div className="space-y-3">
      <WatchListItem
        title="Strength"
        subtitle={
          hasHistory
            ? `${diagnosis.improvingCount} up · ${diagnosis.flatCount} flat · ${diagnosis.decliningCount} down`
            : 'Log the same exercises twice.'
        }
        metric={latestPoint?.actual ? Math.round(latestPoint.actual) : '--'}
        trailing={null}
        subtle
        className="py-3"
      />

      {diagnosis.priorityExercises.length > 0 && (
        <WatchSection title="Exercises" className="space-y-2">
          {diagnosis.priorityExercises.map((exercise) => (
            <ExerciseRow key={exercise.key} exercise={exercise} />
          ))}
        </WatchSection>
      )}

      {diagnosis.trackedCount === 0 && (
        <WatchPanel subtle className="py-3">
          <p className="text-fluid-label font-mono uppercase text-white/45">
            Log the same exercises twice to see what is improving, flat, or dropping.
          </p>
        </WatchPanel>
      )}
    </div>
  );
}

function ExerciseRow({ exercise }: { exercise: ProgressDiagnosis['priorityExercises'][number] }) {
  const statusTone = exercise.status === 'up'
    ? 'text-green-400'
    : exercise.status === 'down'
      ? 'text-red-400'
      : 'text-yellow-400';
  const Icon = exercise.status === 'up' ? ArrowUp : exercise.status === 'down' ? ArrowDown : Minus;

  return (
    <WatchPanel subtle className="bg-black/25 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-fluid-ui font-black uppercase text-white">{exercise.name}</p>
          <p className="text-fluid-label font-mono uppercase text-white/35">{exercise.muscle}</p>
        </div>
        <div className={cn('flex items-center gap-1 font-mono text-sm font-black tabular-nums', statusTone)}>
          <Icon className="h-4 w-4" />
          <span>{formatSigned(exercise.changePct)}%</span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-black/25 px-3 py-2">
        <p className="truncate text-fluid-label font-mono uppercase text-white/35">
          {exercise.previousLabel} to <span className={statusTone}>{exercise.latestLabel}</span>
        </p>
        <p className="shrink-0 text-fluid-label font-mono uppercase text-white/45">
          Best {exercise.bestLabel}
        </p>
      </div>
      {exercise.status !== 'up' && (
        <p className="mt-3 text-fluid-label font-mono uppercase text-white/50">
          {exercise.action}
        </p>
      )}
    </WatchPanel>
  );
}

function formatOneDecimal(value: number): string {
  return value.toFixed(1);
}

function formatSigned(value: number): string {
  return value > 0 ? `+${formatOneDecimal(value)}` : formatOneDecimal(value);
}
