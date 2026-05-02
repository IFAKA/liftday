'use client';

import {
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ProgressFrontier } from '@/lib/progress-insights';
import { cn } from '@/lib/utils';

export function ProgressFrontierGraph({ frontier }: { frontier: ProgressFrontier }) {
  const hasHistory = frontier.current !== null;
  const currentLabel = frontier.current === null ? '--' : Math.round(frontier.current).toString();
  const projectedLabel = frontier.projected === null ? '--' : Math.round(frontier.projected).toString();
  const frontierLabel = frontier.frontier === null ? '--' : Math.round(frontier.frontier).toString();

  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-fluid-label font-black uppercase tracking-widest text-white/40 font-mono">Progress Frontier</p>
          <p className="text-fluid-label font-mono uppercase tracking-wide text-white/30">
            {hasHistory ? `${formatSigned(frontier.weeklyTrend)} pts/week trend` : 'Log more sessions to project trend'}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-right">
          <MiniStat label="now" value={currentLabel} />
          <MiniStat label="proj" value={projectedLabel} />
          <MiniStat label="edge" value={frontierLabel} />
        </div>
      </div>

      <div className="h-44 w-full rounded-xl border border-white/10 bg-black/40 px-1 py-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={frontier.points} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 10, fontFamily: 'monospace' }}
            />
            <YAxis
              domain={['dataMin - 4', 'dataMax + 4']}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'rgba(255,255,255,0.22)', fontSize: 10, fontFamily: 'monospace' }}
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
              formatter={(value, name) => [typeof value === 'number' ? Math.round(value) : value, name]}
            />
            <Line type="monotone" dataKey="actual" name="Actual" stroke="#f8fafc" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
            <Line type="monotone" dataKey="projected" name="Projected" stroke="#38bdf8" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls />
            <Line type="monotone" dataKey="frontier" name="Efficient frontier" stroke="#4ade80" strokeWidth={2} strokeDasharray="1 5" dot={false} connectNulls />
            {frontier.current !== null && (
              <ReferenceDot x={frontier.points.find((point) => point.actual === frontier.current)?.week} y={frontier.current} r={4} fill="#f8fafc" stroke="#050505" />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className={cn('text-fluid-label font-mono uppercase tracking-widest', frontier.action.tone)}>
            {frontier.action.label}
          </span>
          <span className="text-fluid-label font-mono uppercase tracking-wide text-white/65">
            {frontier.action.summary}
          </span>
          <span className="text-fluid-label font-mono uppercase tracking-wide text-white/30">
            {frontier.action.nextAction}
          </span>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-10">
      <div className="text-[9px] font-mono uppercase tracking-widest text-white/25">{label}</div>
      <div className="text-fluid-label font-black tabular-nums text-white/70">{value}</div>
    </div>
  );
}

function formatOneDecimal(value: number): string {
  return value.toFixed(1);
}

function formatSigned(value: number): string {
  return value > 0 ? `+${formatOneDecimal(value)}` : formatOneDecimal(value);
}
