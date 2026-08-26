'use client';

import { useEffect } from 'react';
import { AlertCircle, Check, Copy } from 'lucide-react';
import { QuitConfirmScreen } from './QuitConfirmScreen';
import { CountdownTimerScreen } from './CountdownTimerScreen';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';
import { useWorkoutQuitGuard } from '@/hooks/useWorkoutQuitGuard';
import { showRestCompleteNotification } from '@/lib/rest-notifications';
import { cn } from '@/lib/utils';

interface RestTimerProps {
  seconds: number;
  totalSeconds: number;
  isPaused: boolean;
  onSkip: () => void;
  onQuit: () => void;
  nextExerciseName?: string | null;
  nextSupersetPartnerName?: string | null;
  nextEquipmentBlockPartnerName?: string | null;
  onNextMachineOccupied?: () => void;
}

let restNotificationTimeout: ReturnType<typeof setTimeout> | null = null;

function scheduleRestNotification(secondsRemaining: number, nextExerciseName?: string | null) {
  cancelRestNotification();
  restNotificationTimeout = setTimeout(() => {
    void showRestCompleteNotification(nextExerciseName).catch(() => undefined);
  }, secondsRemaining * 1000);
}

function cancelRestNotification() {
  if (restNotificationTimeout !== null) {
    clearTimeout(restNotificationTimeout);
    restNotificationTimeout = null;
  }
}

export function RestTimer({ seconds, totalSeconds, isPaused, onSkip, onQuit, nextExerciseName, nextSupersetPartnerName, nextEquipmentBlockPartnerName, onNextMachineOccupied }: RestTimerProps) {
  const { copy, isCopied } = useCopyFeedback();
  const { showQuitConfirm, setShowQuitConfirm, requestQuit, confirmQuit } = useWorkoutQuitGuard({
    historyStateKey: 'rest',
    onConfirm: onQuit,
  });
  const copiedName = nextExerciseName ? isCopied(nextExerciseName) : false;

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !isPaused && seconds > 0) {
        scheduleRestNotification(seconds, nextExerciseName);
      } else {
        cancelRestNotification();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelRestNotification();
    };
  }, [seconds, isPaused, nextExerciseName]);

  async function handleCopyNextExerciseName() {
    if (!nextExerciseName) return;
    await copy(nextExerciseName, nextExerciseName);
  }

  return (
    <>
      <CountdownTimerScreen
        title="REST"
        seconds={seconds}
        totalSeconds={totalSeconds}
        isPaused={isPaused}
        primaryAction={{ label: 'SKIP', onClick: onSkip }}
        cancelAction={{ label: 'Quit workout', onClick: requestQuit }}
        secondaryActions={[]}
        footerContext={nextExerciseName ? (
          <div className="mb-2 flex w-full shrink-0 flex-col items-center gap-1 px-4">
            <span className="font-mono text-fluid-label uppercase tracking-widest text-white/30">Next exercise</span>
            <button
              type="button"
              onClick={handleCopyNextExerciseName}
              className="group flex max-w-full flex-col items-center rounded-xl px-3 py-1 text-center active:bg-white/10"
              aria-label={`Copy ${nextExerciseName}`}
            >
              <span className="text-fluid-ui font-black uppercase tracking-tight text-white/80">
                {nextExerciseName}
              </span>
              <span className={cn(
                'mt-1 inline-flex items-center gap-1.5 text-xs font-mono font-black uppercase tracking-widest',
                copiedName ? 'text-green-300' : 'text-white/35'
              )}>
                {copiedName ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copiedName ? 'Copied' : 'Tap name to copy'}
              </span>
            </button>
            {nextSupersetPartnerName && (
              <span className="text-fluid-label font-mono font-black uppercase tracking-widest text-white/45">
                Superset · {nextSupersetPartnerName}
              </span>
            )}
            {!nextSupersetPartnerName && nextEquipmentBlockPartnerName && (
              <span className="text-fluid-label font-mono font-black uppercase tracking-widest text-white/45">
                Same station · {nextEquipmentBlockPartnerName}
              </span>
            )}
            {onNextMachineOccupied && (
              <button
                type="button"
                onClick={onNextMachineOccupied}
                className="mt-1 flex min-h-8 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[11px] font-black uppercase text-white/45 active:scale-95 active:bg-white/10"
              >
                <AlertCircle className="size-3.5 shrink-0" />
                Machine occupied
              </button>
            )}
          </div>
        ) : undefined}
      />
      <QuitConfirmScreen
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        onConfirm={confirmQuit}
      />
    </>
  );
}
