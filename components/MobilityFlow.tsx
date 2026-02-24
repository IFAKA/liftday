'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Pause, SkipForward, X } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { QuitConfirmDialog } from './QuitConfirmDialog';
import { MobilityExercise } from '@/lib/types';
import { ExerciseDemo } from './ExerciseDemo';

interface MobilityFlowProps {
  exercise: MobilityExercise;
  exerciseIndex: number;
  totalExercises: number;
  timer: number;
  side: 'left' | 'right' | null;
  isPaused: boolean;
  onSkip: () => void;
  onPause: () => void;
  onResume: () => void;
  onQuit: () => void;
}

export function MobilityFlow({
  exercise,
  exerciseIndex,
  totalExercises,
  timer,
  side,
  isPaused,
  onSkip,
  onPause,
  onResume,
  onQuit,
}: MobilityFlowProps) {
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const showQuitConfirmRef = useRef(false);
  const progressPercent = (exerciseIndex / totalExercises) * 100;

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
      window.history.pushState({ mobility: true }, '');
    };
    window.history.pushState({ mobility: true }, '');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handlePlayingChange = useCallback(
    (isPlaying: boolean) => {
      if (isPlaying) {
        onPause();
      } else {
        onResume();
      }
    },
    [onPause, onResume]
  );

  return (
    <div className="flex flex-col h-[100dvh] bg-background p-6 overflow-hidden">
      <div className="flex items-center gap-3 mb-2">
        <button
          type="button"
          onClick={() => setShowQuitConfirm(true)}
          className="p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Quit mobility"
        >
          <X className="w-5 h-5" />
        </button>
        <Progress value={progressPercent} className="flex-1 h-1.5" />
        <span className="text-xs text-muted-foreground font-mono">
          {exerciseIndex + 1}/{totalExercises}
        </span>
      </div>

      <QuitConfirmDialog
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        onConfirm={onQuit}
      />

      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {exercise.youtubeId && (
          <ExerciseDemo
            youtubeId={exercise.youtubeId}
            title={exercise.name}
            onPlayingChange={handlePlayingChange}
          />
        )}

        <h1 className="text-2xl font-bold tracking-tight text-center">
          {exercise.name}
        </h1>

        {side && (
          <span className="text-lg font-mono text-muted-foreground uppercase">
            {side} SIDE
          </span>
        )}

        <p className="text-sm text-muted-foreground text-center max-w-xs">
          {exercise.instruction}
        </p>

        <div className="flex items-center gap-2">
          <span
            className={`text-5xl font-mono font-bold transition-opacity ${
              isPaused ? 'opacity-40' : ''
            }`}
          >
            {timer}s
          </span>
          {isPaused && (
            <Pause className="w-5 h-5 text-muted-foreground animate-pulse" />
          )}
        </div>

        <Button
          variant="ghost"
          size="lg"
          onClick={onSkip}
          className="rounded-full w-14 h-14"
        >
          <SkipForward className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}
