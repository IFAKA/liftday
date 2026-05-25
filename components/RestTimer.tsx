'use client';

import { useState, useEffect, useRef } from 'react';
import { QuitConfirmDialog } from './QuitConfirmDialog';
import { CountdownTimerScreen } from './CountdownTimerScreen';
import { showRestCompleteNotification } from '@/lib/rest-notifications';

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
  const showQuitConfirmRef = useRef(false);

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
            <span className="text-center text-fluid-ui font-black uppercase tracking-tight text-white/80">{nextExerciseName}</span>
          </div>
        ) : undefined}
      />
      <QuitConfirmDialog
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        onConfirm={onQuit}
      />
    </>
  );
}
