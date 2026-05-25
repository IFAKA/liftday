'use client';

import { AnimatePresence, LayoutGroup, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface RouteTransitionProps {
  children: ReactNode;
}

export function RouteTransition({ children }: RouteTransitionProps) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const routeTransition = shouldReduceMotion
    ? { duration: 0.08, ease: 'linear' as const }
    : { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id="route-layout">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            data-route-transition
            key={pathname}
            className="h-full min-h-0 bg-black"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0.96, x: 16 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0.96, x: -8 }}
            transition={routeTransition}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </LayoutGroup>
    </MotionConfig>
  );
}
