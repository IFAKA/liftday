'use client';

import { ProgressFrontier } from '@/lib/progress-insights';
import { WatchPanel } from './WatchSurface';

export function ProgressPacePanel({ frontier, active = false }: { frontier: ProgressFrontier; active?: boolean }) {
  const state = getPaceState(frontier);
  const progressScore = frontier.current === null ? '--' : Math.round(frontier.current).toString();
  const actualPace = formatSignedPoints(frontier.weeklyTrend);
  const idealPace = frontier.current === null || frontier.frontier === null
    ? '--'
    : formatSignedPoints((frontier.frontier - frontier.current) / 4);

  return (
    <WatchPanel active={active} className="py-3">
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-fluid-label font-mono uppercase ${state.tone}`}>Pace</p>
            <p className="mt-1 text-fluid-ui font-black uppercase leading-tight text-white">{state.label}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-fluid-label font-mono uppercase leading-none text-white/30">Progress score</p>
            <p className="mt-1 text-fluid-ui font-black tabular-nums leading-none text-white">{progressScore}</p>
          </div>
        </div>

        <p className="mt-3 text-fluid-label font-mono uppercase leading-relaxed text-white/55">{state.summary}</p>
        <p className="mt-2 text-fluid-label font-mono uppercase leading-relaxed text-white/75">{state.action}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <PaceBar label="This week" value={actualPace} percent={state.actualPercent} tone={state.actualTone} />
        <PaceBar label="Plan" value={idealPace} percent={state.idealPercent} tone="bg-white/45" />
      </div>
    </WatchPanel>
  );
}

function PaceBar({
  label,
  value,
  percent,
  tone,
}: {
  label: string;
  value: string;
  percent: number;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-black/25 px-2 py-2">
      <div className="flex items-center justify-between gap-1">
        <span className="whitespace-nowrap text-fluid-label font-mono uppercase text-white/30">{label}</span>
        <span className="whitespace-nowrap text-fluid-label font-mono tabular-nums text-white/45">{value}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full min-w-1 rounded-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function getPaceState(frontier: ProgressFrontier): {
  label: string;
  summary: string;
  action: string;
  tone: string;
  actualTone: string;
  actualPercent: number;
  idealPercent: number;
} {
  if (frontier.current === null || frontier.frontier === null || frontier.projected === null) {
    return {
      label: 'Need logs',
      summary: 'Log two weeks of the same lifts to compare progress points.',
      action: 'Log two weeks of the same lifts.',
      tone: 'text-white/45',
      actualTone: 'bg-white/35',
      actualPercent: 8,
      idealPercent: 8,
    };
  }

  const idealPace = (frontier.frontier - frontier.current) / 4;
  const actualPace = frontier.weeklyTrend;
  const denominator = Math.max(Math.abs(idealPace), Math.abs(actualPace), 1);
  const actualPercent = clampPercent((Math.max(0, actualPace) / denominator) * 100);
  const idealPercent = clampPercent((Math.max(0, idealPace) / denominator) * 100);
  const gap = idealPace - actualPace;
  const summary = `Your progress score ${formatWeeklyChange(actualPace)} this week. The plan expected ${formatSignedPoints(idealPace)}.`;

  if (gap > 1) {
    return {
      label: 'Behind this week',
      summary,
      action: 'Repeat the same weights. Win reps before adding load.',
      tone: 'text-yellow-400',
      actualTone: 'bg-yellow-400',
      actualPercent,
      idealPercent,
    };
  }

  if (gap < -1) {
    return {
      label: 'Ahead of plan',
      summary,
      action: 'Keep jumps small. Protect form and recovery.',
      tone: 'text-sky-400',
      actualTone: 'bg-sky-400',
      actualPercent,
      idealPercent,
    };
  }

  return {
    label: 'On track',
    summary,
    action: 'Keep the plan. Add only when sets hit target.',
    tone: 'text-green-400',
    actualTone: 'bg-green-400',
    actualPercent,
    idealPercent,
  };
}

function formatSignedPoints(value: number): string {
  const rounded = Math.round(value);
  return `${rounded > 0 ? '+' : ''}${rounded} pts`;
}

function formatWeeklyChange(value: number): string {
  const rounded = Math.round(Math.abs(value));

  if (rounded === 0) return 'stayed even';
  if (value > 0) return `rose ${rounded} points`;
  return `fell ${rounded} points`;
}

function clampPercent(value: number): number {
  return Math.max(8, Math.min(100, Math.round(value)));
}
