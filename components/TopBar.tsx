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
    <div className={cn(
      "w-full h-12 sm:h-14 shrink-0 flex items-center justify-between px-2 sm:px-4 pt-safe relative z-50",
      className
    )}>
      <div className="flex-1 flex justify-start">
        {leftAction}
      </div>
      
      <div className="flex-[3] flex flex-col items-center justify-center min-w-0 text-fluid-ui font-black uppercase tracking-tight">
        {center}
      </div>

      <div className="flex-1 flex justify-end">
        {rightAction}
      </div>
    </div>
  );
}
