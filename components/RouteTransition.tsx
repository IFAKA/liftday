'use client';

import { motion, Variants } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';

interface RouteTransitionProps {
  children: ReactNode;
}

const ROUTE_ORDER = ['/', '/muscles', '/program', '/history', '/settings', '/sync'];
const routeVariants: Variants = {
  enter: (direction: number) => ({ x: direction * 18 }),
  center: { x: '0%' },
};

function getRouteScore(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const root = segments.length === 0 ? '/' : `/${segments[0]}`;
  const rootIndex = ROUTE_ORDER.indexOf(root);

  return (rootIndex === -1 ? ROUTE_ORDER.length : rootIndex) * 10 + segments.length;
}

export function RouteTransition({ children }: RouteTransitionProps) {
  const pathname = usePathname();
  const [trackedRoute, setTrackedRoute] = useState({ pathname, direction: 1 });
  let direction = trackedRoute.direction;

  if (pathname !== trackedRoute.pathname) {
    const previousScore = getRouteScore(trackedRoute.pathname);
    const nextScore = getRouteScore(pathname);
    direction = nextScore >= previousScore ? 1 : -1;
    setTrackedRoute({ pathname, direction });
  }

  return (
    <motion.div
      data-route-transition
      key={pathname}
      custom={direction}
      variants={routeVariants}
      initial="enter"
      animate="center"
      transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
      className="h-full min-h-0 bg-black"
    >
      {children}
    </motion.div>
  );
}
