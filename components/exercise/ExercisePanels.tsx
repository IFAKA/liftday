'use client';

import { AlertCircle, Check, ChevronLeft, Copy } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/TopBar';
import type { Exercise, ExerciseKey } from '@/lib/types';
import { cn } from '@/lib/utils';

export function ExerciseCopyTitle({
  exerciseName,
  copied,
  onCopy,
}: {
  exerciseName: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="group mx-auto flex max-w-full flex-col items-center rounded-xl px-2 py-1 text-center active:bg-white/10 sm:mx-0 sm:items-start sm:text-left"
      aria-label={`Copy ${exerciseName}`}
    >
      <span className="text-fluid-exercise font-black uppercase tracking-tighter text-white leading-tight">
        {exerciseName}
      </span>
      <span className={cn(
        'mt-1 inline-flex items-center gap-1.5 text-xs font-mono font-black uppercase tracking-widest',
        copied ? 'text-green-300' : 'text-white/35'
      )}>
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? 'Copied' : 'Tap name to copy'}
      </span>
    </button>
  );
}

export function MachineOccupiedControl({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/25 bg-white/5 text-xs font-medium text-white/60 hover:text-white hover:border-white/40 hover:bg-white/10 active:scale-95 transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out-ui)]"
    >
      <AlertCircle className="size-3.5 shrink-0" />
      Machine occupied
    </button>
  );
}

export function CoachingPanel({
  referenceLabel,
  status,
  statusClassName,
  reason,
  programContext,
  warning,
  persistenceError,
}: {
  referenceLabel: string;
  status: string;
  statusClassName: string;
  reason: string;
  programContext?: string | null;
  warning?: string | null;
  persistenceError?: string | null;
}) {
  return (
    <>
      <div className="mx-auto mb-2 flex w-full max-w-xs items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
        <span className="min-w-0 truncate text-xs font-black uppercase text-white/65">
          {referenceLabel}
        </span>
        <span className={cn('shrink-0 rounded-full px-2 py-1 text-[11px] font-black uppercase', statusClassName)}>
          {status}
        </span>
      </div>
      <div className="mx-auto -mt-1 mb-2 flex w-full max-w-xs flex-col gap-1 text-center text-xs font-medium leading-snug">
        <p className="line-clamp-2 text-white/55">{reason}</p>
        {programContext && (
          <p className="line-clamp-1 font-mono uppercase text-white/35">{programContext}</p>
        )}
        {warning && (
          <p className="line-clamp-2 text-amber-200/80">{warning}</p>
        )}
        {persistenceError && (
          <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-red-100">
            Save failed. {persistenceError}
          </p>
        )}
      </div>
    </>
  );
}

export function RirPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="mx-auto mb-2 flex w-full max-w-xs items-center justify-between gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1">
      {[0, 1, 2, 3, 4].map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            'flex h-10 flex-1 items-center justify-center rounded-full text-sm font-black tabular-nums transition',
            value === option ? 'bg-white text-black' : 'text-white/45 active:bg-white/10'
          )}
          aria-label={`${option} RIR`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function SwapPicker({
  exerciseName,
  swapAlternatives,
  shouldReduceMotion,
  onClose,
  onSelectAlternative,
}: {
  exerciseName: string;
  swapAlternatives: Exercise[];
  shouldReduceMotion: boolean | null;
  onClose: () => void;
  onSelectAlternative?: (exerciseKey: ExerciseKey) => void;
}) {
  return (
    <motion.div
      key="swap-picker"
      initial={{
        opacity: 0,
        transform: shouldReduceMotion ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.98)',
      }}
      animate={{ opacity: 1, transform: 'translateY(0) scale(1)' }}
      exit={{
        opacity: 0,
        transform: shouldReduceMotion ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.98)',
      }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      className="absolute inset-0 z-[60] flex flex-col bg-black/95 px-4 pb-safe pt-3 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="swap-picker-title"
    >
      <TopBar
        leftAction={
          <Button variant="ghost" size="icon-xl" aria-label="Close alternative picker" onClick={onClose} className="-ml-2 text-white/55 hover:bg-white/10 hover:text-white">
            <ChevronLeft className="icon-lg" />
          </Button>
        }
        center={<span id="swap-picker-title" className="text-fluid-label font-black uppercase tracking-tight text-white">Choose swap</span>}
      />

      <div className="flex-1 overflow-y-auto py-3">
        <p className="mb-3 text-fluid-label font-mono uppercase leading-relaxed text-white/45">
          {exerciseName} is busy. Pick what is open now.
        </p>
        <div className="flex flex-col gap-2">
          {swapAlternatives.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                onSelectAlternative?.(option.key);
                onClose();
              }}
              className="min-h-16 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-left active:scale-[0.98] active:bg-white/12"
            >
              <span className="block truncate text-fluid-label font-black uppercase text-white">
                {option.name}
              </span>
              <span className="mt-1 block text-xs font-mono uppercase text-white/40">
                {option.primaryMuscle.replace('_', ' ')}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pb-2">
        <Button
          onClick={onClose}
          className="col-span-2 min-h-12 rounded-full bg-white text-xs font-black uppercase text-black active:scale-95"
        >
          Cancel
        </Button>
      </div>
    </motion.div>
  );
}
