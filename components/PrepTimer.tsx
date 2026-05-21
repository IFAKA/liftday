'use client';

import { RotateCcw, X } from 'lucide-react';
import { Button } from './ui/button';
import { TopBar } from './TopBar';
import { motion } from 'framer-motion';

interface PrepTimerProps {
  mode: 'warmup' | 'stretch';
  seconds: number;
  isRunning?: boolean;
  onCancel?: () => void;
  onPrimary: () => void;
  onStartTimer?: () => void;
  onPreset?: (seconds: 30 | 60) => void;
  onRepeat?: () => void;
  requireCompletionBeforePrimary?: boolean;
}

export function PrepTimer({
  mode,
  seconds,
  isRunning = true,
  onCancel,
  onPrimary,
  onStartTimer,
  onPreset,
  onRepeat,
  requireCompletionBeforePrimary = false,
}: PrepTimerProps) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = seconds <= 0
    ? 'READY'
    : `${mins}:${secs.toString().padStart(2, '0')}`;
  const title = mode === 'warmup' ? 'Warm Up' : 'Stretch';
  const isWaitingToStart = !isRunning && seconds > 0 && Boolean(onStartTimer);
  const isPrimaryLocked = requireCompletionBeforePrimary && isRunning && seconds > 0;
  const primaryLabel = isWaitingToStart
    ? 'Start Timer'
    : isPrimaryLocked
      ? 'Stretching'
      : mode === 'warmup' ? 'Start Workout' : 'Done';
  const handlePrimary = isWaitingToStart && onStartTimer ? onStartTimer : onPrimary;

  return (
    <motion.div className="flex h-full w-full flex-col items-center overflow-hidden bg-black">
      <TopBar
        leftAction={onCancel ? (
          <Button
            variant="ghost"
            size="icon-xl"
            aria-label={mode === 'warmup' ? 'Cancel warm-up' : 'Cancel stretch'}
            onClick={onCancel}
            className="-ml-2 text-white/60 hover:bg-transparent hover:text-white active:text-white"
          >
            <X className="icon-lg" />
          </Button>
        ) : undefined}
        center={<span className="text-fluid-label font-black uppercase tracking-[0.2em] text-white/80">{title}</span>}
      />

      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center px-4">
        <div className="flex min-h-44 w-full flex-col items-center justify-center">
          <p
            className="font-mono text-fluid-timer font-black leading-none tracking-tight text-white tabular-nums"
            aria-live="polite"
          >
            {display}
          </p>
        </div>

        {onPreset && (
          <div className="mt-3 grid w-full max-w-xs grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => onPreset(60)}
              className="h-12 rounded-full border-white/15 bg-white/10 text-fluid-label font-black uppercase tracking-widest text-white/80 active:scale-95 active:bg-white/20"
            >
              1m
            </Button>
            <Button
              variant="outline"
              onClick={() => onPreset(30)}
              className="h-12 rounded-full border-white/15 bg-white/10 text-fluid-label font-black uppercase tracking-widest text-white/80 active:scale-95 active:bg-white/20"
            >
              30s
            </Button>
          </div>
        )}

        {onRepeat && seconds <= 0 && (
          <Button
            variant="outline"
            onClick={onRepeat}
            className="mt-3 h-12 rounded-full border-white/15 bg-white/10 px-5 text-fluid-label font-black uppercase tracking-widest text-white/80 active:scale-95 active:bg-white/20"
          >
            <RotateCcw className="h-4 w-4" />
            Repeat 30s
          </Button>
        )}
      </div>

      <div className="w-full shrink-0 px-4 pb-safe mb-4">
        <Button
          onClick={handlePrimary}
          disabled={isPrimaryLocked}
          className="w-full btn-mobile-accessible rounded-full !bg-white font-black uppercase tracking-tight !text-black shadow-xl transition-transform duration-150 ease-[var(--ease-out-ui)] active:scale-95"
        >
          {primaryLabel}
        </Button>
      </div>
    </motion.div>
  );
}
