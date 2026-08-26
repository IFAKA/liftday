'use client';

import { CountdownTimerScreen } from './CountdownTimerScreen';
import { WatchActionFooter } from './WatchSurface';

export function CooldownStretchScreen({
  phase,
  seconds,
  onRepeat,
  onEnd,
}: {
  phase: 'cooldown-stretch' | 'cooldown-choice';
  seconds: number;
  onRepeat: () => void;
  onEnd: () => void;
}) {
  if (phase === 'cooldown-choice') {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-black px-5 text-center">
        <p className="text-fluid-label font-black uppercase tracking-[0.2em] text-white/55">STRETCH COMPLETE</p>
        <WatchActionFooter
          primary={{ label: 'END', onClick: onEnd }}
          secondary={[{ label: 'REPEAT', onClick: onRepeat }]}
          layout="grid"
          className="mt-8 w-full max-w-xs"
        />
      </div>
    );
  }

  return (
    <CountdownTimerScreen
      title="STRETCH"
      seconds={seconds}
      totalSeconds={30}
      primaryAction={{ label: 'STRETCH', onClick: () => undefined, disabled: true }}
      completedLabel="STRETCH COMPLETE"
    />
  );
}
