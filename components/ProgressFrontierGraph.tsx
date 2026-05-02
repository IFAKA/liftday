'use client';

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { ProgressDiagnosis, ProgressFrontier } from '@/lib/progress-insights';
import { cn } from '@/lib/utils';

export function ProgressFrontierGraph({
  frontier,
  diagnosis,
}: {
  frontier: ProgressFrontier;
  diagnosis: ProgressDiagnosis;
}) {
  const hasHistory = frontier.current !== null;
  const changeLabel = diagnosis.averageChangePct === null ? '--' : formatSigned(diagnosis.averageChangePct);
  const chartPoints = frontier.points.filter((point) => point.actual !== null);

  return (
    <div className="space-y-4">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-fluid-label font-black uppercase tracking-widest text-white/40 font-mono">Progress Check</p>
          <p className={cn('text-fluid-heading font-black uppercase tracking-tight leading-none', diagnosis.tone)}>
            {diagnosis.label}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right">
          <MiniStat label="up" value={diagnosis.improvingCount.toString()} tone="text-green-400" />
          <MiniStat label="flat" value={diagnosis.flatCount.toString()} tone="text-yellow-400" />
          <MiniStat label="down" value={diagnosis.decliningCount.toString()} tone="text-red-400" />
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/35 p-4">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-fluid-label font-mono uppercase tracking-widest text-white/30">Avg change vs last time</p>
            <p className={cn('text-2xl font-black tabular-nums leading-none', diagnosis.averageChangePct === null ? 'text-white/40' : diagnosis.tone)}>
              {changeLabel}{diagnosis.averageChangePct === null ? '' : '%'}
            </p>
          </div>
          <p className="max-w-40 text-right text-fluid-label font-mono uppercase tracking-wide text-white/35">
            {diagnosis.summary}
          </p>
        </div>

        {hasHistory && chartPoints.length > 1 && (
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartPoints} margin={{ top: 8, right: 8, bottom: 0, left: -22 }}>
                <XAxis
                  dataKey="week"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.26)', fontSize: 10, fontFamily: 'monospace' }}
                />
                <YAxis
                  domain={['dataMin - 4', 'dataMax + 4']}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'monospace' }}
                  width={34}
                />
                <Tooltip
                  cursor={{ stroke: 'rgba(255,255,255,0.12)' }}
                  contentStyle={{
                    background: '#050505',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12,
                    color: '#fff',
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', textTransform: 'uppercase' }}
                  formatter={(value) => [typeof value === 'number' ? Math.round(value) : value, 'Strength index']}
                />
                <Line type="monotone" dataKey="actual" name="Strength index" stroke="#f8fafc" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="mt-2 text-[10px] font-mono uppercase tracking-wide text-white/25">
          Strength index uses your logged sets. 100 is your first logged baseline.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <p className="mb-3 text-fluid-label font-black uppercase tracking-widest text-white/35 font-mono">Fix first</p>
        <div className="space-y-2">
          {diagnosis.nextActions.map((action) => (
            <p key={action} className="text-fluid-label font-mono uppercase tracking-wide text-white/70">
              {action}
            </p>
          ))}
        </div>
      </div>

      {diagnosis.priorityExercises.length > 0 && (
        <div className="space-y-2">
          <p className="text-fluid-label font-black uppercase tracking-widest text-white/35 font-mono">Exercise Detail</p>
          {diagnosis.priorityExercises.map((exercise) => (
            <ExerciseRow key={exercise.key} exercise={exercise} />
          ))}
        </div>
      )}

      {diagnosis.volumeGaps.length > 0 && (
        <div className="space-y-2">
          <p className="text-fluid-label font-black uppercase tracking-widest text-white/35 font-mono">Volume Gaps</p>
          {diagnosis.volumeGaps.map((gap) => (
            <div key={gap.muscle} className="rounded-xl border border-white/10 bg-black/25 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-fluid-ui font-black uppercase tracking-tight text-white">{gap.muscle}</p>
                <p className="text-fluid-label font-mono tabular-nums text-yellow-400">
                  {gap.sets}/{gap.target} sets
                </p>
              </div>
              <p className="mt-1 text-fluid-label font-mono uppercase tracking-wide text-white/45">{gap.action}</p>
            </div>
          ))}
        </div>
      )}

      {diagnosis.trackedCount === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-fluid-label font-mono uppercase tracking-wide text-white/45">
            Log the same exercises twice to see what is improving, flat, or dropping.
          </p>
        </div>
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
    <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-fluid-ui font-black uppercase tracking-tight text-white">{exercise.name}</p>
          <p className="text-fluid-label font-mono uppercase tracking-wide text-white/35">{exercise.muscle}</p>
        </div>
        <div className={cn('flex items-center gap-1 font-mono text-sm font-black tabular-nums', statusTone)}>
          <Icon className="h-4 w-4" />
          <span>{formatSigned(exercise.changePct)}%</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <MiniStat label="last" value={exercise.previousLabel} />
        <MiniStat label="now" value={exercise.latestLabel} tone={statusTone} />
        <MiniStat label="best" value={exercise.bestLabel} />
      </div>
      {exercise.status !== 'up' && (
        <p className="mt-3 text-fluid-label font-mono uppercase tracking-wide text-white/50">
          {exercise.action}
        </p>
      )}
    </div>
  );
}

function MiniStat({ label, value, tone = 'text-white/70' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-mono uppercase tracking-widest text-white/25">{label}</div>
      <div className={cn('truncate text-fluid-label font-black tabular-nums', tone)}>{value}</div>
    </div>
  );
}

function formatOneDecimal(value: number): string {
  return value.toFixed(1);
}

function formatSigned(value: number): string {
  return value > 0 ? `+${formatOneDecimal(value)}` : formatOneDecimal(value);
}
