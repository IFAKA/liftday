'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface RouteTransitionProps {
  children: ReactNode;
}

export function RouteTransition({ children }: RouteTransitionProps) {
  const pathname = usePathname();

  return (
    <div
      data-route-transition
      key={pathname}
      className="h-full min-h-0 bg-black"
    >
      {children}
    </div>
  );
}
