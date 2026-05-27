'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TopBarProps {
  leftAction?: ReactNode;
  center?: ReactNode;
  rightAction?: ReactNode;
  className?: string;
}

export function TopBar({ leftAction, center, rightAction, className }: TopBarProps) {
  return (
    <header className={cn(
      'grid h-14 w-full shrink-0 grid-cols-[1fr_minmax(0,4fr)_1fr] items-center px-3 pt-safe sm:h-16 sm:px-4 md:h-14 relative z-50',
      className
    )}>
      <div className="flex justify-start scale-110">
        {leftAction}
      </div>

      <div className="min-w-0 justify-self-center text-center text-fluid-ui font-black uppercase text-white">
        {center}
      </div>

      <div className="flex justify-end scale-110">
        {rightAction}
      </div>
    </header>
  );
}
