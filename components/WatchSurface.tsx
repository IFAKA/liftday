'use client';

import Link from 'next/link';
import { Check, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface WatchScreenProps {
  top?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function WatchScreen({ top, children, footer, className, bodyClassName }: WatchScreenProps) {
  return (
    <div className={cn('flex h-full flex-col overflow-hidden bg-black text-white', className)}>
      {top}
      <main className={cn('min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-1 no-scrollbar', bodyClassName)}>
        {children}
      </main>
      {footer}
    </div>
  );
}

interface WatchBackButtonProps {
  href?: string;
  fallbackHref?: string;
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
}

export function WatchBackButton({
  href,
  fallbackHref,
  onClick,
  ariaLabel = 'Back',
  className,
}: WatchBackButtonProps) {
  const router = useRouter();
  const classes = cn(
    '-ml-2 size-11 rounded-full text-white/55 hover:bg-transparent hover:text-white active:bg-white/10 active:text-white',
    className
  );

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (fallbackHref) {
      router.push(fallbackHref);
      return;
    }
    router.back();
  };

  if (href) {
    return (
      <Button asChild variant="ghost" size="icon" aria-label={ariaLabel} className={classes}>
        <Link href={href}>
          <ChevronLeft className="h-5 w-5" />
        </Link>
      </Button>
    );
  }

  return (
    <Button type="button" variant="ghost" size="icon" aria-label={ariaLabel} onClick={handleClick} className={classes}>
      <ChevronLeft className="h-5 w-5" />
    </Button>
  );
}

type WatchActionTone = 'primary' | 'secondary' | 'danger';

interface WatchActionProps extends ComponentProps<typeof Button> {
  tone?: WatchActionTone;
}

function getWatchActionClassName(tone: WatchActionTone): string {
  if (tone === 'primary') {
    return 'bg-white text-black hover:bg-white/90';
  }
  if (tone === 'danger') {
    return 'border-red-400/25 bg-red-400/10 text-red-100 hover:bg-red-400/15';
  }
  return 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white';
}

export function WatchPrimaryAction({ className, tone = 'primary', ...props }: WatchActionProps) {
  return (
    <Button
      className={cn(
        'w-full btn-mobile-accessible rounded-full font-black uppercase tracking-tight active:scale-95 transition-[background-color,transform] duration-150 ease-[var(--ease-out-ui)]',
        getWatchActionClassName(tone),
        className
      )}
      {...props}
    />
  );
}

export function WatchSecondaryAction({ className, tone = 'secondary', variant = 'outline', ...props }: WatchActionProps) {
  return (
    <Button
      variant={variant}
      className={cn(
        'btn-mobile-secondary rounded-full font-black uppercase tracking-tight active:scale-95 transition-[background-color,transform] duration-150 ease-[var(--ease-out-ui)]',
        getWatchActionClassName(tone),
        className
      )}
      {...props}
    />
  );
}

interface WatchEmptyStateProps {
  icon?: LucideIcon;
  title: ReactNode;
  message?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function WatchEmptyState({ icon: Icon, title, message, action, className }: WatchEmptyStateProps) {
  return (
    <div className={cn('flex min-h-48 flex-col items-center justify-center px-4 text-center', className)}>
      {Icon && <Icon className="mb-4 h-12 w-12 text-white/30" />}
      <h1 className="text-fluid-title font-black uppercase leading-none text-white">{title}</h1>
      {message && <p className="mt-3 max-w-xs text-fluid-label font-mono uppercase leading-relaxed text-white/45">{message}</p>}
      {action && <div className="mt-5 w-full">{action}</div>}
    </div>
  );
}

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

interface WatchStatusPillProps {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function WatchStatusPill({ children, tone = 'neutral', className }: WatchStatusPillProps) {
  const toneClassName = {
    neutral: 'border-white/10 bg-white/10 text-white/55',
    success: 'border-green-400/25 bg-green-400/10 text-green-300',
    warning: 'border-orange-400/25 bg-orange-400/10 text-orange-300',
    danger: 'border-red-400/25 bg-red-400/10 text-red-300',
  }[tone];

  return (
    <span className={cn('shrink-0 rounded-full border px-3 py-1 text-fluid-label font-black uppercase', toneClassName, className)}>
      {children}
    </span>
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
    'h-auto w-full justify-start whitespace-normal rounded-xl border px-4 py-4 text-left font-normal transition-[background-color,border-color,box-shadow,color,transform] duration-150 ease-[var(--ease-out-ui)]',
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
        'flex h-auto w-full items-center gap-4 rounded-xl border border-white/5 bg-white/5 px-4 py-4 text-left transition-[background-color,opacity] duration-150 ease-[var(--ease-out-ui)]',
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
