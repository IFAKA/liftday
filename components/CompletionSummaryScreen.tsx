'use client';

import type { ReactNode } from 'react';
import { WatchActionFooter, WatchScreen } from './WatchSurface';

interface CompletionSummaryScreenProps {
  icon: ReactNode;
  title: string;
  metric: string | number;
  metricLabel: string;
  badge?: ReactNode;
  onDone: () => void;
}

export function CompletionSummaryScreen({
  icon,
  title,
  metric,
  metricLabel,
  badge,
  onDone,
}: CompletionSummaryScreenProps) {
  return (
    <WatchScreen
      scrollable={false}
      bodyClassName="flex flex-col items-center justify-center py-8"
      footer={<WatchActionFooter primary={{ label: 'DONE', onClick: onDone }} />}
      footerClassName="mb-4 z-10"
    >
      {icon}

      <h1 className="mb-3 text-center text-fluid-label font-black uppercase tracking-[0.2em] text-white/80">
        {title}
      </h1>

      <p className="text-center text-fluid-timer font-black leading-none tracking-tighter text-white tabular-nums">
        {metric}
      </p>
      <p className="mt-2 text-center text-fluid-ui font-black uppercase tracking-[0.1em] text-white/60">
        {metricLabel}
      </p>

      {badge}
    </WatchScreen>
  );
}
