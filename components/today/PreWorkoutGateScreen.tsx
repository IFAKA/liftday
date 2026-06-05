'use client';

import type { ReactNode } from 'react';
import { TopBar } from '@/components/TopBar';
import { WatchScreen } from '@/components/WatchSurface';
import { formatDisplayDate } from '@/lib/workout-utils';

interface PreWorkoutGateScreenProps {
  date: Date;
  icon?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
  footer: ReactNode;
  bodyClassName?: string;
  footerClassName?: string;
  scrollable?: boolean;
}

export function PreWorkoutGateScreen({
  date,
  icon,
  title,
  subtitle,
  children,
  footer,
  bodyClassName,
  footerClassName,
  scrollable = false,
}: PreWorkoutGateScreenProps) {
  return (
    <WatchScreen
      scrollable={scrollable}
      top={(
        <TopBar
          center={
            <span className="text-fluid-label font-mono font-black uppercase tracking-widest text-white/70">
              {formatDisplayDate(date)}
            </span>
          }
        />
      )}
      bodyClassName={bodyClassName}
      footer={footer}
      footerClassName={footerClassName}
    >
      {icon}
      <h1 className="text-center text-fluid-title font-black uppercase leading-none text-white">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-3 text-fluid-label font-mono font-black uppercase text-white/45">
          {subtitle}
        </p>
      )}
      {children}
    </WatchScreen>
  );
}
