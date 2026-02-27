'use client';

import { useState, useRef, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Info, X, ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';
import type { Exercise } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ExerciseDemo } from './ExerciseDemo';
import { QuitConfirmDialog } from './QuitConfirmDialog';
import { NumberWheel } from './NumberWheel';

interface ExerciseScreenProps {
  exercise: Exercise;
  exerciseIndex: number;
  totalExercises: number;
  currentSet: number;
  setsPerExercise: number;
  currentTarget: number;
  previousRep: number | null;
  flashColor: 'green' | 'red' | null;
  onLogSet: (value: number) => void;
  onQuit: () => void;
}

export function ExerciseScreen({
  exercise,
  exerciseIndex,
  totalExercises,
  currentSet,
  setsPerExercise,
  currentTarget,
  previousRep,
  flashColor,
  onLogSet,
  onQuit,
}: ExerciseScreenProps) {
  const [showInstruction, setShowInstruction] = useState(false);
  const [isInstructionClosing, setIsInstructionClosing] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const showInstructionRef = useRef(false);

  const closeInstruction = () => {
    setIsInstructionClosing(true);
    setTimeout(() => {
      setIsInstructionClosing(false);
      setShowInstruction(false);
    }, 200);
  };

  useEffect(() => {
    showInstructionRef.current = showInstruction;
  }, [showInstruction]);

  useEffect(() => {
    setShowInstruction(false); // eslint-disable-line react-hooks/set-state-in-effect
    setShowQuitConfirm(false);
  }, [exerciseIndex, currentSet]);

  useEffect(() => {
    const handlePopState = () => {
      if (showInstructionRef.current) {
        setShowInstruction(false);
      } else {
        setShowQuitConfirm(true);
      }
      window.history.pushState({ exercise: true }, '');
    };
    window.history.pushState({ exercise: true }, '');
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  return (
    <div
      className={cn(
        'flex flex-col h-[100dvh] bg-background transition-colors duration-500 overflow-hidden',
        flashColor === 'green' && 'bg-green-950/30',
        flashColor === 'red' && 'bg-red-950/30'
      )}
    >
      {(showInstruction || isInstructionClosing) && (
        <div className={`fixed inset-0 z-40 bg-background flex flex-col ${isInstructionClosing ? 'animate-out slide-out-to-bottom fade-out-0 duration-200' : 'animate-in slide-in-from-bottom fade-in-0 duration-200'}`}>
          <button
            type="button"
            onClick={closeInstruction}
            className="flex items-center gap-3 p-4 text-left"
            aria-label="Close how to"
          >
            <ChevronLeft className="w-6 h-6 text-muted-foreground shrink-0" />
            <h2 className="text-lg font-semibold flex-1">{exercise.name}</h2>
          </button>
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 pb-8 overflow-y-auto min-h-0">
            {exercise.youtubeId && (
              <div className="w-full max-w-sm">
                <ExerciseDemo youtubeId={exercise.youtubeId} title={exercise.name} />
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed">
              {exercise.instruction}
            </p>
            <Button
              variant="outline"
              className="rounded-full px-6"
              onClick={closeInstruction}
            >
              Got it
            </Button>
          </div>
        </div>
      )}

      <div className="fixed top-0 left-0 right-0 z-10 bg-background flex items-center gap-3 p-4 pb-2">
        <button
          type="button"
          onClick={() => setShowQuitConfirm(true)}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label="Quit workout"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 flex items-center gap-[3px] h-1.5">
          {Array.from({ length: totalExercises }).map((_, exIdx) => (
            <div key={exIdx} className="flex flex-1 gap-px">
              {Array.from({ length: setsPerExercise }).map((_, setIdx) => {
                const done = exIdx < exerciseIndex || (exIdx === exerciseIndex && setIdx < currentSet);
                const active = exIdx === exerciseIndex && setIdx === currentSet;
                return (
                  <div
                    key={setIdx}
                    className={cn(
                      'h-1.5 flex-1 rounded-sm transition-colors duration-200',
                      done ? 'bg-foreground' : active ? 'bg-foreground/40' : 'bg-muted-foreground/20'
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-3 overflow-y-auto min-h-0 px-4 py-2 pt-14">
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-center font-[family-name:var(--font-geist-sans)]">
            {exercise.name}
          </h1>
          <button
            type="button"
            onClick={() => setShowInstruction(true)}
            className="flex items-center gap-1.5 text-xs transition-colors border rounded-full px-3 py-1 text-muted-foreground/80 hover:text-foreground border-muted-foreground/30"
          >
            <Info className="w-3.5 h-3.5" />
            <span>how to</span>
          </button>
        </div>

        <NumberWheel
          key={`${exerciseIndex}-${currentSet}`}
          defaultValue={currentTarget}
          max={exercise.unit === 'seconds' ? 120 : 40}
          label={exercise.unit === 'seconds' ? 'Seconds held' : 'Reps done'}
          onConfirm={onLogSet}
        />

        {previousRep !== null && (
          <div className="flex items-center gap-2 text-muted-foreground shrink-0">
            {flashColor === 'green' ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : flashColor === 'red' ? (
              <TrendingDown className="w-4 h-4 text-red-500" />
            ) : (
              <Minus className="w-4 h-4" />
            )}
            <span className="text-lg font-mono">{previousRep}</span>
          </div>
        )}
      </div>

      {flashColor && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          {flashColor === 'green' ? (
            <TrendingUp
              className="w-24 h-24 text-green-500"
              style={{ animation: 'feedback-pop 400ms ease-out forwards' }}
            />
          ) : (
            <TrendingDown
              className="w-24 h-24 text-red-500"
              style={{ animation: 'feedback-pop 400ms ease-out forwards' }}
            />
          )}
        </div>
      )}

      <QuitConfirmDialog
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        onConfirm={onQuit}
      />
    </div>
  );
}
