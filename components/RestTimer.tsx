'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, Copy } from 'lucide-react';
import { QuitConfirmScreen } from './QuitConfirmScreen';
import { CountdownTimerScreen } from './CountdownTimerScreen';
import { copyText } from '@/lib/clipboard';
import { showRestCompleteNotification } from '@/lib/rest-notifications';
import { cn } from '@/lib/utils';

interface RestTimerProps {
  seconds: number;
  totalSeconds: number;
  isPaused: boolean;
  onSkip: () => void;
  onQuit: () => void;
  onUndo: () => void;
  nextExerciseName?: string | null;
}

let restNotificationTimeout: ReturnType<typeof setTimeout> | null = null;

function scheduleRestNotification(secondsRemaining: number, nextExerciseName?: string | null) {
  cancelRestNotification();
  restNotificationTimeout = setTimeout(() => {
    showRestCompleteNotification(nextExerciseName);
  }, secondsRemaining * 1000);
}

function cancelRestNotification() {
  if (restNotificationTimeout !== null) {
    clearTimeout(restNotificationTimeout);
    restNotificationTimeout = null;
  }
}

export function RestTimer({ seconds, totalSeconds, isPaused, onSkip, onQuit, onUndo, nextExerciseName }: RestTimerProps) {
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [copiedExerciseName, setCopiedExerciseName] = useState<string | null>(null);
  const showQuitConfirmRef = useRef(false);
  const copiedName = copiedExerciseName === nextExerciseName;

  useEffect(() => {
    showQuitConfirmRef.current = showQuitConfirm;
  }, [showQuitConfirm]);

  useEffect(() => {
    const handlePopState = () => {
      if (showQuitConfirmRef.current) {
        setShowQuitConfirm(false);
      } else {
        setShowQuitConfirm(true);
      }
      window.history.pushState({ rest: true }, '');
    };
    window.history.pushState({ rest: true }, '');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
    await copyText(nextExerciseName);
    setCopiedExerciseName(nextExerciseName);
    window.setTimeout(() => {
      setCopiedExerciseName((currentName) => (
        currentName === nextExerciseName ? null : currentName
      ));
    }, 1400);
  }

  return (
    <>
      <CountdownTimerScreen
        title="Resting"
        seconds={seconds}
        totalSeconds={totalSeconds}
        isPaused={isPaused}
        primaryAction={{ label: 'Skip Rest', onClick: onSkip }}
        cancelAction={{ label: 'Quit workout', onClick: () => setShowQuitConfirm(true) }}
        secondaryActions={[{ label: 'Undo Last Set', onClick: onUndo }]}
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
          </div>
        ) : undefined}
      />
      <QuitConfirmScreen
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        onConfirm={onQuit}
      />
    </>
  );
}
