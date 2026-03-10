'use client';

import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { REST_DURATION } from '@/lib/constants';
import { QuitConfirmDialog } from './QuitConfirmDialog';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface RestTimerProps {
  seconds: number;
  isPaused: boolean;
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

export function RestTimer({ seconds, isPaused, onSkip, onQuit, onUndo }: RestTimerProps) {
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
    <motion.div
      className="flex flex-col items-center w-full h-full bg-black overflow-hidden relative"
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.1}
      onDragEnd={(e, { offset, velocity }) => {
        // Vertical: Swipe down to quit
        if (offset.y > 60 || velocity.y > 600) {
          setShowQuitConfirm(true);
        }
        // Horizontal: Swipe right to undo (mimic system back)
        if (offset.x > 60 || velocity.x > 600) {
          onUndo();
        }
      }}
    >
      <TopBar
        leftAction={
          <Button variant="ghost" size="icon" onClick={() => setShowQuitConfirm(true)} className="-ml-2 text-white/60 hover:text-white hover:bg-transparent active:text-white">
            <X className="w-6 h-6" />
          </Button>
        }
        center={<span className="text-fluid-label font-black uppercase tracking-[0.2em] text-white/80">Resting</span>}
      />

      {/* Large Timer area (Above buttons) */}
      <div className="flex-1 w-full flex flex-col items-center justify-center relative min-h-0">
        {/* Edge Timer Ring (Apple Watch Style) */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            '--timer-progress': progress,
            background: `conic-gradient(from -90deg, white calc(var(--timer-progress) * 1%), transparent 0%)`,
            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 5px), black calc(100% - 4px))',
            mask: 'radial-gradient(farthest-side, transparent calc(100% - 5px), black calc(100% - 4px))',
            transition: '--timer-progress 1s linear',
          } as CSSProperties}
        />

        <span
          className={cn(
            "font-mono font-black tabular-nums tracking-tighter transition-all duration-300 z-10 text-fluid-timer",
            seconds <= 3 && seconds > 0 ? "text-white scale-110" : "text-white"
          )}
          style={seconds <= 3 && seconds > 0 ? { animation: 'countdown-pulse 0.15s ease-out' } : undefined}
          key={seconds <= 3 ? seconds : 'normal'}
        >
          {display}
        </span>
      </div>

      {/* Action buttons at the bottom - Stacked Column */}
      <div className="w-full px-6 pb-safe mb-6 shrink-0 flex flex-col gap-4 z-20">
        <Button
          onClick={onSkip}
          className="w-full h-16 sm:h-20 rounded-full font-black uppercase tracking-tight bg-white text-black active:scale-95 transition-all shadow-2xl text-xl"
        >
          Skip Rest
        </Button>
        
        <Button
          variant="outline"
          onClick={onUndo}
          className="w-full h-14 sm:h-16 rounded-full text-sm font-black uppercase tracking-widest bg-white/10 border-white/20 text-white/80 active:bg-white/20 active:scale-95 transition-all border"
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
