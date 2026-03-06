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
  const [val, setVal] = useState(currentTarget);
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
    setVal(currentTarget);
  }, [exerciseIndex, currentSet, currentTarget]);

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
        'flex flex-col h-[100dvh] bg-background transition-colors duration-500 overflow-hidden items-center justify-between gap-2 p-4 pt-2 pb-6 relative',
        // Mobile (default) - centered layout
        'w-full max-w-sm mx-auto',
        // Desktop - wider layout with better spacing
        'md:max-w-md md:px-6 md:gap-3',
        'lg:max-w-lg lg:px-8 lg:gap-4',
        // Smartwatch - compact layout (only for extremely small screens)
        'max-[320px]:max-w-[280px]',
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
              className="rounded-full px-6 py-2"
              onClick={closeInstruction}
            >
              Got it
            </Button>
          </div>
        </div>
      )}

      {/* Progress Strip + Corners */}
      <div className="w-full flex items-center gap-3 px-2 h-6 shrink-0 relative z-10">
        <button
          type="button"
          onClick={() => setShowQuitConfirm(true)}
          className="p-1 text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
          aria-label="Quit workout"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 flex items-center gap-[3px] h-1">
          {Array.from({ length: totalExercises }).map((_, exIdx) => (
            <div key={exIdx} className="flex flex-1 gap-px">
              {Array.from({ length: setsPerExercise }).map((_, setIdx) => {
                const done = exIdx < exerciseIndex || (exIdx === exerciseIndex && setIdx < currentSet);
                const active = exIdx === exerciseIndex && setIdx === currentSet;
                return (
                  <div
                    key={setIdx}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors duration-200',
                      done ? 'bg-foreground' : active ? 'bg-foreground/40' : 'bg-muted-foreground/20'
                    )}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowInstruction(true)}
          className="p-1 text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
          aria-label="How to"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>

      {/* Header Section */}
      <div className="flex flex-col items-center gap-1 text-center mt-2 shrink-0">
        <h1 className="text-lg font-bold uppercase tracking-tight leading-tight">{exercise.name}</h1>
      </div>

      {/* Center Piece: Wheel */}
      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0">
        <NumberWheel
          key={`${exerciseIndex}-${currentSet}`}
          defaultValue={currentTarget}
          max={exercise.unit === 'seconds' ? 120 : 40}
          label={exercise.unit === 'seconds' ? 'Seconds held' : 'Reps done'}
          onConfirm={onLogSet}
          onChange={setVal}
          hideButton={true}
        />

        {previousRep !== null && (
          <div className="flex items-center gap-1.5 text-muted-foreground/60 mt-4 sm:gap-2">
            {flashColor === 'green' ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : flashColor === 'red' ? (
              <TrendingDown className="w-4 h-4 text-red-500" />
            ) : (
              <Minus className="w-4 h-4" />
            )}
            <span className="text-sm font-mono font-medium">{previousRep} PREVIOUS</span>
          </div>
        )}
      </div>

      {/* Footer Section */}
      <div className="w-full pb-2 shrink-0">
        <Button 
          onClick={() => onLogSet(val)} 
          className="w-full rounded-full py-7 text-lg font-bold shadow-lg active:scale-[0.98] transition-all bg-foreground text-background hover:bg-foreground/90"
        >
          LOG SET
        </Button>
      </div>

      {/* Feedback Overlay */}
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
