'use client';

import type { ComponentProps, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface WatchPanelProps extends ComponentProps<'div'> {
  children: ReactNode;
  active?: boolean;
  subtle?: boolean;
}

export function WatchPanel({ children, className, active = false, subtle = false, ...props }: WatchPanelProps) {
  return (
    <Card
      className={cn(
        'w-full gap-0 rounded-xl border px-4 py-4 shadow-none',
        active
          ? 'border-white/25 bg-white/15 ring-2 ring-white/15'
          : subtle
            ? 'border-white/5 bg-white/[0.03]'
            : 'border-white/5 bg-white/5',
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}

interface WatchSignalPanelProps {
  label: ReactNode;
  title: ReactNode;
  summary?: ReactNode;
  action?: ReactNode;
  metric?: ReactNode;
  metricLabel?: ReactNode;
  tone?: string;
  active?: boolean;
  subtle?: boolean;
  children?: ReactNode;
  className?: string;
}

export function WatchSignalPanel({
  label,
  title,
  summary,
  action,
  metric,
  metricLabel,
  tone = 'text-white/45',
  active = false,
  subtle = false,
  children,
  className,
}: WatchSignalPanelProps) {
  return (
    <WatchPanel active={active} subtle={subtle} className={className}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={cn('text-fluid-label font-mono uppercase', tone)}>{label}</p>
          <p className="mt-1 text-fluid-ui font-black uppercase leading-tight text-white">{title}</p>
          {summary && (
            <p className="mt-3 text-fluid-label font-mono uppercase leading-relaxed text-white/55">
              {summary}
            </p>
          )}
        </div>
        {metric && (
          <div className="shrink-0 text-right">
            <p className="text-fluid-ui font-black tabular-nums leading-none text-white">{metric}</p>
            {metricLabel && <p className="mt-1 text-fluid-label font-mono uppercase text-white/30">{metricLabel}</p>}
          </div>
        )}
      </div>
      {action && (
        <p className="mt-3 text-fluid-label font-mono uppercase leading-relaxed text-white/45">
          {action}
        </p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </WatchPanel>
  );
}

interface WatchMetricCellProps {
  label: ReactNode;
  value: ReactNode;
  tone?: string;
  className?: string;
}

export function WatchMetricCell({ label, value, tone = 'text-white/75', className }: WatchMetricCellProps) {
  return (
    <div className={cn('min-w-0 rounded-lg border border-white/5 bg-black/25 px-3 py-2', className)}>
      <div className="truncate text-fluid-label font-mono uppercase text-white/25">{label}</div>
      <div className={cn('truncate text-fluid-ui font-black tabular-nums', tone)}>{value}</div>
    </div>
  );
}

interface WatchMetricGridProps {
  children: ReactNode;
  columns?: 2 | 3;
  className?: string;
}

export function WatchMetricGrid({ children, columns = 3, className }: WatchMetricGridProps) {
  return (
    <div className={cn(columns === 2 ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-3 gap-2', className)}>
      {children}
    </div>
  );
}

interface WatchBarRowProps {
  label: ReactNode;
  value: ReactNode;
  meta?: ReactNode;
  percent: number;
  tone?: string;
  className?: string;
}

export function WatchBarRow({
  label,
  value,
  meta,
  percent,
  tone = 'bg-white/45',
  className,
}: WatchBarRowProps) {
  const width = Math.max(4, Math.min(100, Math.round(percent)));

  return (
    <div className={cn('flex min-h-8 items-center gap-3', className)}>
      <span className="w-20 shrink-0 truncate text-fluid-label font-mono uppercase text-white/35">
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${width}%` }} />
      </div>
      <span className="w-10 shrink-0 text-right text-fluid-label font-mono tabular-nums text-white/45">
        {value}
      </span>
      {meta && (
        <span className="w-12 shrink-0 text-right text-fluid-label font-mono tabular-nums text-white/25">
          {meta}
        </span>
      )}
    </div>
  );
}

export const WatchProgressRow = WatchBarRow;

interface WatchKeyValueRowProps {
  label: ReactNode;
  value: ReactNode;
  meta?: ReactNode;
  className?: string;
}

export function WatchKeyValueRow({ label, value, meta, className }: WatchKeyValueRowProps) {
  return (
    <div className={cn('flex min-h-10 items-center justify-between gap-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2', className)}>
      <div className="min-w-0">
        <p className="truncate text-fluid-label font-mono uppercase text-white/35">{label}</p>
        {meta && <p className="mt-0.5 truncate text-[10px] font-mono uppercase text-white/25">{meta}</p>}
      </div>
      <p className="shrink-0 text-right text-fluid-label font-mono font-black tabular-nums uppercase text-white/65">{value}</p>
    </div>
  );
}

interface WatchTrendChartPoint {
  x: number;
  y: number;
}

interface WatchTrendChartProps {
  points: WatchTrendChartPoint[];
  ariaLabel: string;
  stroke?: string;
  strokeWidth?: number | string;
  pointFill?: string;
  showAxes?: boolean;
  padding?: number;
  width?: number;
  height?: number;
  className?: string;
  children?: ReactNode;
}

export function WatchTrendChart({
  points,
  ariaLabel,
  stroke = 'rgba(255,255,255,0.7)',
  strokeWidth = 4,
  pointFill,
  showAxes = false,
  padding = 12,
  width = 240,
  height = 112,
  className,
  children,
}: WatchTrendChartProps) {
  const path = points.length
    ? points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
    : '';

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('h-28 w-full overflow-visible', className)}
      preserveAspectRatio="none"
    >
      {showAxes && (
        <>
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        </>
      )}
      {path && <path d={path} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />}
      {pointFill && points.map((point) => <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r="3" fill={pointFill} />)}
      {children}
    </svg>
  );
}
