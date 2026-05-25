'use client';

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
  const isPrimaryLocked = requireCompletionBeforePrimary && isRunning && seconds > 0;
  const primaryLabel = isWaitingToStart
    ? 'Start Timer'
    : isPrimaryLocked
      ? 'Stretching'
      : mode === 'warmup' ? 'Start Workout' : 'Done';
  const handlePrimary = isWaitingToStart && onStartTimer ? onStartTimer : onPrimary;
  const repeatLabel = totalSeconds === 60 ? 'Repeat 1m' : 'Repeat 30s';

  return (
    <CountdownTimerScreen
      title={title}
      seconds={seconds}
      totalSeconds={totalSeconds}
      isRunning={isRunning}
      primaryAction={{
        label: primaryLabel,
        onClick: handlePrimary,
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
      repeatAction={onRepeat ? { label: repeatLabel, onClick: onRepeat } : undefined}
    />
  );
}
