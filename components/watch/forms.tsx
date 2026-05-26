'use client';

import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { WatchPanel } from './data-display';

interface WatchMeasurementInputProps {
  label: string;
  unit?: string;
  ariaUnit?: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: string;
  onEnter?: () => void;
  compact?: boolean;
}

export function WatchMeasurementInput({
  label,
  unit = 'cm',
  ariaUnit,
  value,
  onChange,
  min,
  max,
  step = '0.1',
  onEnter,
  compact = false,
}: WatchMeasurementInputProps) {
  const spokenUnit = ariaUnit ?? (unit === 'cm' ? 'centimeters' : unit === 'kg' ? 'kilograms' : unit);

  return (
    <label className="min-w-0">
      {!compact && <span className="block truncate text-fluid-label font-mono uppercase text-white/35">{label}</span>}
      <div className={cn('flex min-w-0 items-center gap-1.5 border border-white/10 bg-black/40 px-2', compact ? 'rounded-full' : 'mt-1 rounded-lg')}>
        <Input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={compact ? label : `${label} ${spokenUnit}`}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onEnter?.();
          }}
          className={cn(
            'border-0 bg-transparent px-0 font-black tabular-nums text-white shadow-none focus-visible:ring-0',
            compact ? 'h-11 text-center font-mono text-fluid-label' : 'h-10 text-fluid-label'
          )}
        />
        {!compact && <span className="shrink-0 text-[10px] font-mono uppercase text-white/30">{unit}</span>}
      </div>
    </label>
  );
}

interface WatchDetailsPanelProps {
  summary: ReactNode;
  children: ReactNode;
  className?: string;
}

export function WatchDetailsPanel({ summary, children, className }: WatchDetailsPanelProps) {
  return (
    <details className={cn('rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3', className)}>
      <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-white/35">
        {summary}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

export function WatchSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('flex min-h-11 rounded-full border border-white/10 bg-black/35 p-1', className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={option.value === value}
          className={cn(
            'min-h-9 flex-1 rounded-full px-2 text-fluid-label font-black uppercase text-white/45 transition-colors',
            option.value === value && 'bg-white text-black'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface WatchMeasurementGridProps {
  children: ReactNode;
  className?: string;
}

export function WatchMeasurementGrid({ children, className }: WatchMeasurementGridProps) {
  return <div className={cn('grid grid-cols-2 gap-2', className)}>{children}</div>;
}

interface WatchFormPanelProps {
  children: ReactNode;
  action?: ReactNode;
  error?: ReactNode;
  hint?: ReactNode;
  className?: string;
  surface?: boolean;
}

export function WatchFormPanel({ children, action, error, hint, className, surface = true }: WatchFormPanelProps) {
  const content = (
    <>
      <div className={cn(action && 'flex items-start gap-2')}>
        <div className="min-w-0 flex-1">
          {children}
          {error ? (
            <p className="mt-2 text-fluid-label font-mono uppercase text-red-300">{error}</p>
          ) : hint ? (
            <p className="mt-2 text-fluid-label font-mono uppercase text-white/30">{hint}</p>
          ) : null}
        </div>
        {action}
      </div>
    </>
  );

  if (!surface) {
    return <div className={className}>{content}</div>;
  }

  return (
    <WatchPanel subtle className={cn('py-4', className)}>
      {content}
    </WatchPanel>
  );
}
