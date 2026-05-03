'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
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
