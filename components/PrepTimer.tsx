'use client';

import { Play, RotateCcw } from 'lucide-react';
import { CountdownTimerScreen } from './CountdownTimerScreen';

interface PrepTimerProps {
  mode: 'warmup' | 'stretch';
  seconds: number;
  totalSeconds: number;
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
  totalSeconds,
  isRunning = true,
  onCancel,
  onPrimary,
  onStartTimer,
  onPreset,
  onRepeat,
  requireCompletionBeforePrimary = false,
}: PrepTimerProps) {
  const title = mode === 'warmup' ? 'Warm Up' : 'Stretch';
  const isWaitingToStart = !isRunning && seconds > 0 && Boolean(onStartTimer);
  const isComplete = seconds <= 0;
  const isPrimaryLocked = requireCompletionBeforePrimary && !isComplete;
  const primaryLabel = mode === 'warmup' ? 'Start Workout' : 'Done';
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
        label: mode === 'warmup' ? 'Cancel warm-up' : 'Cancel stretch',
        onClick: onCancel,
      } : undefined}
      durationPresets={onPreset ? [
        { label: '1m', onClick: () => onPreset(60) },
        { label: '30s', onClick: () => onPreset(30) },
      ] : undefined}
      centerAction={centerAction}
    />
  );
}
