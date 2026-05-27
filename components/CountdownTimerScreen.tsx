'use client';

import type { ReactNode } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { TopBar } from './TopBar';

type TimerAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

type DurationPreset = {
  label: string;
  onClick: () => void;
};

interface CountdownTimerScreenProps {
  title: string;
  seconds: number;
  totalSeconds: number;
  isRunning?: boolean;
  isPaused?: boolean;
  primaryAction: TimerAction;
  cancelAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryActions?: TimerAction[];
  durationPresets?: DurationPreset[];
  repeatAction?: TimerAction;
  footerContext?: ReactNode;
  completedLabel?: string;
}

function formatTimer(seconds: number, completedLabel: string) {
  if (seconds <= 0) return completedLabel;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function CountdownTimerScreen({
  title,
  seconds,
  totalSeconds,
  isRunning = true,
  isPaused = false,
  primaryAction,
  cancelAction,
  secondaryActions = [],
  durationPresets,
  repeatAction,
  footerContext,
  completedLabel = 'READY',
}: CountdownTimerScreenProps) {
  const clampedTotalSeconds = Math.max(1, totalSeconds);
  const clampedSeconds = Math.max(0, Math.min(seconds, clampedTotalSeconds));
  const progress = ((clampedTotalSeconds - clampedSeconds) / clampedTotalSeconds) * 100;
  const circumference = 2 * Math.PI * 45;
  const display = formatTimer(seconds, completedLabel);
  const isFinalCountdown = isRunning && !isPaused && seconds <= 3 && seconds > 0;
  const showRepeat = Boolean(repeatAction && seconds <= 0);
  const showPresets = Boolean(durationPresets?.length && !showRepeat);

  return (
    <motion.div className="relative flex h-full w-full flex-col items-center overflow-hidden bg-black">
      <TopBar
        leftAction={cancelAction ? (
          <Button
            variant="ghost"
            size="icon-xl"
            aria-label={cancelAction.label}
            onClick={cancelAction.onClick}
            className="-ml-2 text-white/60 hover:bg-transparent hover:text-white active:text-white"
          >
            <X className="icon-lg" />
          </Button>
        ) : undefined}
        center={<span className="text-fluid-label font-black uppercase tracking-[0.2em] text-white/80">{title}</span>}
      />

      <main className="flex min-h-0 w-full flex-1 flex-col items-center justify-center px-4">
        <div
          className="relative flex items-center justify-center"
          style={{ width: 'min(75vw, 45dvh)', height: 'min(75vw, 45dvh)' }}
        >
          <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress / 100)}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>

          <span
            className={`z-10 font-mono text-fluid-timer font-black tracking-tighter text-white tabular-nums transition-[opacity,transform] duration-150 ease-[var(--ease-out-ui)]${isFinalCountdown ? ' scale-105' : ''}${isPaused ? ' opacity-50' : ''}`}
            style={isFinalCountdown ? { animation: 'countdown-pulse 150ms var(--ease-out-ui)' } : undefined}
            key={isFinalCountdown ? seconds : display}
            aria-live="polite"
          >
            {display}
          </span>
        </div>

        {showPresets && (
          <div className="mt-3 grid w-full max-w-xs grid-cols-2 gap-2">
            {durationPresets!.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                onClick={preset.onClick}
                className="h-12 rounded-full border-white/15 bg-white/10 text-fluid-label font-black uppercase tracking-widest text-white/80 active:scale-95 active:bg-white/20"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        )}

        {showRepeat && (
          <Button
            variant="outline"
            onClick={repeatAction!.onClick}
            disabled={repeatAction!.disabled}
            className="mt-3 w-full max-w-xs min-h-[44px] btn-mobile-secondary rounded-full border-white/15 bg-white/10 text-fluid-label font-black uppercase tracking-widest text-white/80 active:scale-95 active:bg-white/20"
          >
            <RotateCcw className="h-4 w-4" />
            {repeatAction!.label}
          </Button>
        )}
      </main>

      {footerContext}

      <footer className="z-20 mb-4 flex w-full shrink-0 flex-col gap-4 px-4 pb-safe">
        <Button
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
          className="w-full btn-mobile-accessible rounded-full !bg-white font-black uppercase tracking-tight !text-black shadow-xl transition-transform duration-150 ease-[var(--ease-out-ui)] active:scale-95"
        >
          {primaryAction.label}
        </Button>

        {secondaryActions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            onClick={action.onClick}
            disabled={action.disabled}
            className="w-full btn-mobile-secondary rounded-full border-white/20 bg-white/10 text-fluid-label font-black uppercase tracking-widest text-white/80 transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out-ui)] active:scale-95 active:bg-white/20"
          >
            {action.label}
          </Button>
        ))}
      </footer>
    </motion.div>
  );
}
