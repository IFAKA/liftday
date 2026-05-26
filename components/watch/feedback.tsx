'use client';

import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { WatchPanel } from './data-display';

interface WatchAlertPanelProps {
  tone: 'warning' | 'danger';
  children: ReactNode;
  className?: string;
}

export function WatchAlertPanel({ tone, children, className }: WatchAlertPanelProps) {
  const toneClassName = tone === 'warning'
    ? 'border-amber-300/35 bg-amber-300/10 text-amber-100 [&_svg]:text-amber-200'
    : 'border-red-500/40 bg-red-500/10 text-red-100 [&_svg]:text-red-400';

  return (
    <WatchPanel className={cn('py-3', toneClassName, className)}>
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <p className="text-fluid-label font-black uppercase leading-tight">
          {children}
        </p>
      </div>
    </WatchPanel>
  );
}
