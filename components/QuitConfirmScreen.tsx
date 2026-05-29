'use client';

import { AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { WatchPrimaryAction, WatchSecondaryAction } from './watch';

interface QuitConfirmScreenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function QuitConfirmScreen({ open, onOpenChange, onConfirm }: QuitConfirmScreenProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.section
          key="quit-confirm"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="quit-confirm-title"
          aria-describedby="quit-confirm-description"
          initial={{
            opacity: shouldReduceMotion ? 0 : 1,
            transform: shouldReduceMotion ? 'translateY(0)' : 'translateY(100%)',
          }}
          animate={{ opacity: 1, transform: 'translateY(0)' }}
          exit={{
            opacity: shouldReduceMotion ? 0 : 1,
            transform: shouldReduceMotion ? 'translateY(0)' : 'translateY(100%)',
          }}
          transition={{ duration: shouldReduceMotion ? 0.16 : 0.28, ease: [0.32, 0.72, 0, 1] }}
          className="fixed inset-0 z-[80] flex flex-col bg-black px-5 pb-safe pt-safe text-white"
        >
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-6 text-center">
            <div className="mb-5 grid size-12 place-items-center rounded-full border border-red-300/20 bg-red-400/10 text-red-200">
              <AlertTriangle className="size-6" aria-hidden="true" />
            </div>
            <p className="mb-3 text-fluid-label font-mono font-black uppercase tracking-widest text-red-200/80">
              Stop session
            </p>
            <h1 id="quit-confirm-title" className="max-w-[17rem] text-fluid-exercise font-black uppercase leading-none text-white">
              Quit workout?
            </h1>
            <p id="quit-confirm-description" className="mt-4 max-w-[16rem] text-fluid-label leading-relaxed text-white/55">
              This session&apos;s progress will be lost.
            </p>
          </div>

          <div className="w-full shrink-0 space-y-2 pb-20">
            <WatchPrimaryAction type="button" tone="danger" className="h-12" onClick={onConfirm}>
              Quit
            </WatchPrimaryAction>
            <WatchSecondaryAction type="button" className="h-12 w-full" onClick={() => onOpenChange(false)} autoFocus>
              Cancel
            </WatchSecondaryAction>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
