'use client';

import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { Play, Pause, X } from 'lucide-react';
import { Button } from './ui/button';
import { REST_DURATION } from '@/lib/constants';
import { QuitConfirmDialog } from './QuitConfirmDialog';
import { cn } from '@/lib/utils';

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

import { TopBar } from './TopBar';

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
      cancelRestNotification();
    };
  }, [seconds, isPaused]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  const progress = ((REST_DURATION - seconds) / REST_DURATION) * 100;

  return (
    <div className="flex flex-col items-center w-full h-full bg-black overflow-hidden relative">
      <TopBar
        leftAction={
          <button onClick={() => setShowQuitConfirm(true)} className="p-2 -ml-2 text-white/50 active:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        }
        center={<span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Resting</span>}
      />

      {/* Circular timer */}
      <div className="relative w-full max-w-[140px] aspect-square flex items-center justify-center shrink-0 min-h-0 my-auto">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            '--timer-progress': progress,
            background: `conic-gradient(from -90deg, rgba(255,255,255,1) calc(var(--timer-progress) * 1%), rgba(255,255,255,0.15) 0%)`,
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 3px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 3px))',
            transition: '--timer-progress 1s linear',
          } as CSSProperties}
        />
        <div className="flex flex-col items-center justify-center">
          <span
            className={cn(
              "font-mono font-black tabular-nums tracking-tighter transition-all duration-300",
              seconds <= 3 && seconds > 0 ? "text-white text-5xl scale-110" : "text-white text-4xl"
            )}
            style={seconds <= 3 && seconds > 0 ? { animation: 'countdown-pulse 0.15s ease-out' } : undefined}
            key={seconds <= 3 ? seconds : 'normal'}
          >
            {display}
          </span>
          
          <button
            onClick={onPauseToggle}
            className="mt-2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:bg-white/20 transition-colors"
          >
            {isPaused ? <Play className="w-5 h-5 fill-current ml-0.5" /> : <Pause className="w-5 h-5 fill-current" />}
          </button>
        </div>
      </div>

      {/* Action buttons: undo · skip */}
      <div className="w-full px-2 pb-2 mt-auto shrink-0 flex gap-2">
        <Button
          variant="outline"
          onClick={onUndo}
          className="flex-1 rounded-full h-11 text-sm font-black uppercase tracking-tight bg-[#1A1A1A] border-0 text-white active:scale-95 transition-all"
        >
          Undo
        </Button>

        <Button
          onClick={onSkip}
          className="flex-[1.5] rounded-full h-11 text-sm font-black uppercase tracking-tight bg-white text-black active:scale-95 transition-all shadow-lg"
        >
          Skip
        </Button>
      </div>

      <QuitConfirmDialog
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        onConfirm={onQuit}
      />
    </div>
  );
}
