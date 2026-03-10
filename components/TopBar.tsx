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
      "w-full h-14 sm:h-16 shrink-0 flex items-center justify-between px-4 sm:px-6 pt-safe relative z-50",
      className
    )}>
      <div className="flex-1 flex justify-start scale-110">
        {leftAction}
      </div>
      
      <div className="flex-[4] flex flex-col items-center justify-center min-w-0 text-fluid-ui font-black uppercase tracking-tight text-white">
        {center}
      </div>

      <div className="flex-1 flex justify-end scale-110">
        {rightAction}
      </div>
    </div>
  );
}
