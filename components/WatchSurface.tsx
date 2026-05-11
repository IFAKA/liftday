'use client';

import Link from 'next/link';
import { Check, ChevronRight, Copy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface WatchSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function WatchSection({ title, children, className }: WatchSectionProps) {
  return (
    <section className={className}>
      {title && (
        <div className="mb-2 px-1">
          <span className="text-fluid-label font-black uppercase text-white/40">{title}</span>
        </div>
      )}
      {children}
    </section>
  );
}

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

interface WatchCopyButtonProps {
  copied: boolean;
  onClick: () => void;
  label: string;
  copiedLabel?: string;
  className?: string;
}

export function WatchCopyButton({ copied, onClick, label, copiedLabel = 'Copied', className }: WatchCopyButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        'min-h-11 w-full rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white active:scale-[0.98]',
        copied && 'border-green-400/30 bg-green-400/10 text-green-400',
        className
      )}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span className="text-[11px] font-black uppercase tracking-widest font-mono">
        {copied ? copiedLabel : label}
      </span>
    </Button>
  );
}

interface WatchListItemProps {
  label?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  metric?: ReactNode;
  trailing?: ReactNode;
  active?: boolean;
  subtle?: boolean;
  className?: string;
}

export function WatchListItem({
  label,
  title,
  subtitle,
  href,
  onClick,
  icon: Icon,
  metric,
  trailing,
  active = false,
  subtle = false,
  className,
}: WatchListItemProps) {
  const content = (
    <>
      {Icon && <Icon className="h-5 w-5 shrink-0 text-white/45" />}
      <div className="min-w-0 flex-1">
        {label && <p className="text-fluid-label font-mono uppercase text-white/40">{label}</p>}
        <p className="mt-1 truncate text-fluid-ui font-black uppercase text-white">{title}</p>
        {subtitle && <p className="mt-1 line-clamp-2 text-fluid-label text-white/40">{subtitle}</p>}
      </div>
      {metric && <div className="shrink-0 text-fluid-label font-mono tabular-nums text-white/40">{metric}</div>}
      {trailing ?? <ChevronRight className="h-5 w-5 shrink-0 text-white/30" />}
    </>
  );

  const classes = cn(
    'h-auto w-full justify-start whitespace-normal rounded-xl border px-4 py-4 text-left font-normal transition-all',
    active
      ? 'border-white/25 bg-white/15 ring-2 ring-white/15'
      : subtle
        ? 'border-white/5 bg-white/[0.03] active:bg-white/10'
        : 'border-white/5 bg-white/5 active:bg-white/10',
    className
  );

  if (href) {
    return (
      <Button asChild variant="ghost" className={classes}>
        <Link href={href} className="flex items-center gap-4">
          {content}
        </Link>
      </Button>
    );
  }

  return (
    <Button type="button" variant="ghost" onClick={onClick} className={cn(classes, 'flex items-center gap-4')}>
      {content}
    </Button>
  );
}

interface WatchSwitchItemProps {
  id: string;
  label?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function WatchSwitchItem({
  id,
  label,
  title,
  subtitle,
  icon: Icon,
  checked,
  onCheckedChange,
  disabled = false,
  className,
}: WatchSwitchItemProps) {
  return (
    <div
      className={cn(
        'flex h-auto w-full items-center gap-4 rounded-xl border border-white/5 bg-white/5 px-4 py-4 text-left transition-all',
        disabled ? 'opacity-50' : 'active:bg-white/10',
        className
      )}
    >
      <label
        htmlFor={id}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-4',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        )}
      >
        {Icon && <Icon className="h-5 w-5 shrink-0 text-white/45" />}
        <div className="min-w-0 flex-1">
          {label && <p className="text-fluid-label font-mono uppercase text-white/40">{label}</p>}
          <p className="mt-1 truncate text-fluid-ui font-black uppercase text-white">{title}</p>
          {subtitle && <p className="mt-1 line-clamp-2 text-fluid-label text-white/40">{subtitle}</p>}
        </div>
      </label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="h-7 w-12 data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-white/15 [&_[data-slot=switch-thumb]]:size-6 [&_[data-slot=switch-thumb]]:data-[state=checked]:translate-x-5"
      />
    </div>
  );
}
