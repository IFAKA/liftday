'use client';

import { Play, RotateCcw } from 'lucide-react';
import { CountdownTimerScreen } from './CountdownTimerScreen';

interface PrepTimerProps {
  mode: 'warmup-stretch' | 'warmup-plank' | 'stretch';
  seconds: number;
  totalSeconds: number;
  isRunning?: boolean;
  onCancel?: () => void;
  onPrimary: () => void;
  onStartTimer?: () => void;
  onRepeat?: () => void;
  requireCompletionBeforePrimary?: boolean;
}

export function PrepTimer({
  mode,
  seconds,
  totalSeconds,
  isRunning = true,
  onCancel,
  onPrimary,
  onStartTimer,
  onRepeat,
  requireCompletionBeforePrimary = false,
}: PrepTimerProps) {
  const isStretch = mode === 'stretch';
  const isManualWarmup = mode === 'warmup-stretch';
  const title = isStretch ? 'STRETCH' : isManualWarmup ? 'WARM-UP STRETCH' : 'PLANK';
  const isWaitingToStart = !isRunning && seconds > 0 && Boolean(onStartTimer);
  const isComplete = seconds <= 0;
  const isPrimaryLocked = (requireCompletionBeforePrimary || mode === 'warmup-plank') && !isComplete;
  const primaryLabel = isManualWarmup ? 'DONE' : isStretch ? 'DONE' : 'DONE';
  const durationLabel = totalSeconds === 60 ? '1m' : '30s';
  const centerAction = isWaitingToStart && onStartTimer
    ? {
        label: `Start ${durationLabel}`,
        ariaLabel: `Start ${durationLabel} timer`,
        onClick: onStartTimer,
        icon: <Play className="size-8 fill-current" />,
      }
    : isComplete && onRepeat
      ? {
          label: `Repeat ${durationLabel}`,
          ariaLabel: `Repeat ${durationLabel} timer`,
          onClick: onRepeat,
          icon: <RotateCcw className="size-8" />,
        }
      : undefined;

  return (
    <CountdownTimerScreen
      title={title}
      seconds={seconds}
      totalSeconds={totalSeconds}
      isRunning={isRunning}
      primaryAction={{
        label: primaryLabel,
        onClick: onPrimary,
        disabled: isPrimaryLocked,
      }}
      cancelAction={onCancel ? {
        label: 'Cancel workout',
        onClick: onCancel,
      } : undefined}
      durationPresets={undefined}
      centerAction={centerAction}
    />
  );
}
