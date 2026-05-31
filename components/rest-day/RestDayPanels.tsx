'use client';

import type { ReactNode } from 'react';
import { motion } from 'motion/react';

export function RestDayActionRow({
  children,
  className,
  shouldReduceMotion,
}: {
  children: ReactNode;
  className?: string;
  shouldReduceMotion: boolean | null;
}) {
  return (
    <motion.div
      layout={shouldReduceMotion ? false : 'position'}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
