'use client';

import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { SkipForward, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { REST_DURATION } from '@/lib/constants';
import { QuitConfirmDialog } from './QuitConfirmDialog';

interface RestTimerProps {
  seconds: number;
  isPaused: boolean;
  onPauseToggle: () => void;
  onSkip: () => void;
  onQuit: () => void;
  onUndo: () => void;
}

// Schedule a local notification for when the rest timer ends
let restNotificationTimeout: ReturnType<typeof setTimeout> | null = null;

function scheduleRestNotification(secondsRemaining: number) {
  cancelRestNotification();
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  restNotificationTimeout = setTimeout(() => {
    try {
      new Notification('LiftDay — Rest Complete', {
        body: 'Time to get back to work!',
        icon: '/icons/icon-192.png',
        tag: 'rest-complete',
        requireInteraction: false,
      });
    } catch {
      // Notification not available
    }
  }, secondsRemaining * 1000);
}

function cancelRestNotification() {
  if (restNotificationTimeout !== null) {
    clearTimeout(restNotificationTimeout);
    restNotificationTimeout = null;
  }
}

export function RestTimer({ seconds, isPaused, onPauseToggle, onSkip, onQuit, onUndo }: RestTimerProps) {
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

  // Request notification permission on mount (silently — no prompt if already asked)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Schedule/cancel notification based on visibility and paused state
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !isPaused && seconds > 0) {
        scheduleRestNotification(seconds);
      } else {
        cancelRestNotification();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Cancel notification when component unmounts (skip pressed, quit, etc.)
      cancelRestNotification();
    };
  }, [seconds, isPaused]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  const progress = ((REST_DURATION - seconds) / REST_DURATION) * 100;

  return (
    <div className="flex flex-col items-center justify-between h-[100dvh] bg-background p-4 pt-2 pb-6 relative overflow-hidden">
      {/* Label */}
      <div className="flex flex-col items-center gap-1 z-10 shrink-0 mt-2">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">
          Resting
        </h2>
      </div>

      {/* Circular timer */}
      <div className="relative w-56 h-56 flex items-center justify-center shrink-0">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            '--timer-progress': progress,
            background: isPaused
              ? `conic-gradient(from -90deg, oklch(0.55 0 0) calc(var(--timer-progress) * 1%), oklch(0.70 0 0 / 25%) 0%)`
              : `conic-gradient(from -90deg, oklch(0.95 0 0) calc(var(--timer-progress) * 1%), oklch(0.70 0 0 / 25%) 0%)`,
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 6px), black calc(100% - 6px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 6px), black calc(100% - 6px))',
            transition: '--timer-progress 1s linear',
          } as CSSProperties}
        />
        <div className="flex flex-col items-center gap-2">
          <span
            className={`font-mono font-black tracking-tighter transition-colors duration-300 ${
              seconds <= 3 && seconds > 0
                ? 'text-yellow-500 text-6xl'
                : isPaused
                  ? 'text-muted-foreground/40 text-7xl'
                  : 'text-7xl'
            }`}
            style={seconds <= 3 && seconds > 0 ? { animation: 'countdown-pulse 0.15s ease-out' } : undefined}
            key={seconds <= 3 ? seconds : 'normal'}
          >
            {display}
          </span>
          <button
            onClick={onPauseToggle}
            className="p-2 text-muted-foreground/60 active:scale-90 transition-transform"
          >
            {isPaused ? <Play className="w-8 h-8 fill-current" /> : <Pause className="w-8 h-8 fill-current" />}
          </button>
        </div>
      </div>

      {/* Action buttons: undo · skip */}
      <div className="w-full max-w-sm flex flex-col gap-4 z-10 shrink-0">
        <div className="flex gap-3 w-full">
          <Button
            variant="outline"
            size="lg"
            onClick={onUndo}
            className="flex-1 rounded-full py-8 text-xs font-black uppercase tracking-widest border-2"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Undo
          </Button>

          <Button
            size="lg"
            onClick={onSkip}
            className="flex-[1.5] rounded-full py-8 text-lg font-black uppercase tracking-tighter bg-foreground text-background hover:bg-foreground/90"
          >
            <SkipForward className="w-6 h-6 mr-2 fill-current" />
            Skip
          </Button>
        </div>
        <button
          onClick={() => setShowQuitConfirm(true)}
          className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 hover:text-red-500/60 transition-colors py-2"
        >
          Quit Workout
        </button>
      </div>

      <QuitConfirmDialog
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        onConfirm={onQuit}
      />
    </div>
  );
}
