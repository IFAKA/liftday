'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { TopBar } from './TopBar';
import { QuitConfirmDialog } from './QuitConfirmDialog';
import { motion } from 'motion/react';
import { showRestCompleteNotification } from '@/lib/rest-notifications';

interface RestTimerProps {
  seconds: number;
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

export function RestTimer({ seconds, isPaused, onSkip, onQuit, onUndo, nextExerciseName }: RestTimerProps) {
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [maxSeconds] = useState(seconds);
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

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  const progress = ((maxSeconds - seconds) / maxSeconds) * 100;
  const circumference = 2 * Math.PI * 45;

  return (
    <motion.div
      className="flex flex-col items-center w-full h-full bg-black overflow-hidden relative"
    >
      <TopBar
        leftAction={
          <Button variant="ghost" size="icon-xl" aria-label="Quit workout" onClick={() => setShowQuitConfirm(true)} className="-ml-2 text-white/60 hover:text-white hover:bg-transparent active:text-white">
            <X className="icon-lg" />
          </Button>
        }
        center={<span className="text-fluid-label font-black uppercase tracking-[0.2em] text-white/80">Resting</span>}
      />

      <div className="flex-1 w-full flex items-center justify-center min-h-0">
        <div
          className="relative flex items-center justify-center"
          style={{ width: 'min(75vw, 45dvh)', height: 'min(75vw, 45dvh)' }}
        >
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
            <circle
              cx="50" cy="50" r="45"
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
            className={`font-mono font-black tabular-nums tracking-tighter transition-transform duration-150 ease-[var(--ease-out-ui)] z-10 text-fluid-timer text-white${seconds <= 3 && seconds > 0 ? ' scale-105' : ''}`}
            style={seconds <= 3 && seconds > 0 ? { animation: 'countdown-pulse 150ms var(--ease-out-ui)' } : undefined}
            key={seconds <= 3 ? seconds : 'normal'}
          >
            {display}
          </span>
        </div>
      </div>

      {nextExerciseName && (
        <div className="w-full px-4 shrink-0 flex flex-col items-center gap-1 mb-2">
          <span className="text-fluid-label font-mono uppercase tracking-widest text-white/30">Next exercise</span>
          <span className="text-fluid-ui font-black uppercase tracking-tight text-white/80 text-center">{nextExerciseName}</span>
        </div>
      )}

      <div className="w-full px-4 pb-safe mb-4 shrink-0 flex flex-col gap-4 z-20">
        <Button
          onClick={onSkip}
          className="w-full btn-mobile-accessible rounded-full font-black uppercase tracking-tight bg-white text-black active:scale-95 transition-transform duration-150 ease-[var(--ease-out-ui)] shadow-xl"
        >
          Skip Rest
        </Button>

        <Button
          variant="outline"
          onClick={onUndo}
          className="w-full btn-mobile-secondary rounded-full text-fluid-label font-black uppercase tracking-widest bg-white/10 border-white/20 text-white/80 active:bg-white/20 active:scale-95 transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out-ui)]"
        >
          Undo Last Set
        </Button>
      </div>

      <QuitConfirmDialog
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        onConfirm={onQuit}
      />
    </motion.div>
  );
}
