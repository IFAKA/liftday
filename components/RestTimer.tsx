'use client';

import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { TopBar } from './TopBar';
import { REST_DURATION } from '@/lib/constants';
import { QuitConfirmDialog } from './QuitConfirmDialog';
import { motion } from 'framer-motion';

interface RestTimerProps {
  seconds: number;
  isPaused: boolean;
  onSkip: () => void;
  onQuit: () => void;
  onUndo: () => void;
}

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

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

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
  const circumference = 2 * Math.PI * 45;

  return (
    <motion.div
      className="flex flex-col items-center w-full h-full bg-black overflow-hidden relative"
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.1}
      onDragEnd={(_, { offset, velocity }) => {
        if (offset.y > 60 || velocity.y > 600) setShowQuitConfirm(true);
        if (offset.x > 60 || velocity.x > 600) onUndo();
      }}
    >
      <TopBar
        leftAction={
          <Button variant="ghost" size="icon-xl" onClick={() => setShowQuitConfirm(true)} className="-ml-2 text-white/60 hover:text-white hover:bg-transparent active:text-white">
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
            className={`font-mono font-black tabular-nums tracking-tighter transition-all duration-300 z-10 text-fluid-timer text-white${seconds <= 3 && seconds > 0 ? ' scale-110' : ''}`}
            style={seconds <= 3 && seconds > 0 ? { animation: 'countdown-pulse 0.15s ease-out' } : undefined}
            key={seconds <= 3 ? seconds : 'normal'}
          >
            {display}
          </span>
        </div>
      </div>

      <div className="w-full px-4 pb-safe mb-4 shrink-0 flex flex-col gap-4 z-20">
        <Button
          onClick={onSkip}
          className="w-full btn-mobile-accessible rounded-full font-black uppercase tracking-tight bg-white text-black active:scale-95 transition-all shadow-xl"
        >
          Skip Rest
        </Button>

        <Button
          variant="outline"
          onClick={onUndo}
          className="w-full btn-mobile-secondary rounded-full text-fluid-label font-black uppercase tracking-widest bg-white/10 border-white/20 text-white/80 active:bg-white/20 active:scale-95 transition-all"
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
