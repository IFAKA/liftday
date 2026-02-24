'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Pause, X } from 'lucide-react';
import { Button } from './ui/button';
import { MicroBreakExercise } from '@/lib/types';
import { ExerciseDemo } from './ExerciseDemo';
import { playBreakStart, playCountdownTick, playBreakDone } from '@/lib/audio';

interface MicroBreakProps {
  exercise: MicroBreakExercise;
  onDismiss: () => void;
}

export function MicroBreak({ exercise, onDismiss }: MicroBreakProps) {
  const [timer, setTimer] = useState(exercise.duration);
  const [canDismiss, setCanDismiss] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownPlayedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    playBreakStart();
  }, []);

  useEffect(() => {
    if (isPaused || timer <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setCanDismiss(true);
          playBreakDone();
          return 0;
        }
        const next = t - 1;
        if (next <= 3 && next > 0 && !countdownPlayedRef.current.has(next)) {
          countdownPlayedRef.current.add(next);
          playCountdownTick(next);
        }
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPaused, timer]);

  useEffect(() => {
    if (!canDismiss) return;
    const timeout = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timeout);
  }, [canDismiss, onDismiss]);

  const handlePlayingChange = useCallback((isPlaying: boolean) => {
    setIsPaused(isPlaying);
  }, []);

  const mins = Math.floor(timer / 60);
  const secs = timer % 60;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-6 gap-6">
      {exercise.youtubeId && (
        <ExerciseDemo
          youtubeId={exercise.youtubeId}
          title={exercise.name}
          onPlayingChange={handlePlayingChange}
        />
      )}

      <h1 className="text-2xl font-bold tracking-tight">{exercise.name}</h1>

      <p className="text-sm text-muted-foreground text-center max-w-xs">
        {exercise.instruction}
      </p>

      <div className="flex items-center gap-2">
        <span
          className={`text-5xl font-mono font-bold transition-opacity ${
            isPaused ? 'opacity-40' : ''
          }`}
        >
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
        {isPaused && (
          <Pause className="w-5 h-5 text-muted-foreground animate-pulse" />
        )}
      </div>

      {canDismiss && (
        <Button
          variant="ghost"
          size="lg"
          onClick={onDismiss}
          className="rounded-full w-14 h-14"
        >
          <X className="w-6 h-6" />
        </Button>
      )}
    </div>
  );
}
