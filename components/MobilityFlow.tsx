'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, ChevronLeft, Info } from 'lucide-react';
import { Button } from './ui/button';
import { QuitConfirmDialog } from './QuitConfirmDialog';
import { MobilityExercise } from '@/lib/types';
import { ExerciseDemo } from './ExerciseDemo';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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
  const [showTutorial, setShowTutorial] = useState(false);
  const showQuitConfirmRef = useRef(false);
  
  const progressPercent = (exerciseIndex / totalExercises) * 100;

  useEffect(() => {
    showQuitConfirmRef.current = showQuitConfirm;
  }, [showQuitConfirm]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowTutorial(false);
  }, [exerciseIndex]);

  useEffect(() => {
    const handlePopState = () => {
      if (showTutorial) {
        setShowTutorial(false);
      } else if (showQuitConfirmRef.current) {
        setShowQuitConfirm(false);
      } else {
        setShowQuitConfirm(true);
      }
      window.history.pushState({ mobility: true }, '');
    };
    window.history.pushState({ mobility: true }, '');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showTutorial]);

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
    <div className="relative w-full h-[100dvh] bg-black overflow-hidden flex flex-col px-safe pb-safe">
      {/* Absolute Edge Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-50">
        <div
          className="h-full bg-white transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <AnimatePresence initial={false} mode="popLayout">
        {showTutorial ? (
          <motion.div
            key="tutorial"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="absolute inset-0 z-40 bg-black flex flex-col pt-safe"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.x > 50 || velocity.x > 500) {
                setShowTutorial(false);
              }
            }}
          >
            {/* Tutorial Header */}
            <div className="px-4 flex items-center shrink-0 mb-4 h-12">
              <button
                onClick={() => setShowTutorial(false)}
                className="w-12 h-12 flex items-center justify-center -ml-2 rounded-full active:bg-white/10 text-white transition-colors"
                aria-label="Back to mobility"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
            </div>

            {/* Tutorial Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-8 flex flex-col items-center">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-6 text-center">
                {exercise.name}
              </h2>
              {exercise.youtubeId && (
                <div className="w-full max-w-md aspect-video mb-6 rounded-2xl overflow-hidden bg-white/5 shadow-2xl">
                  <ExerciseDemo
                    youtubeId={exercise.youtubeId}
                    title={exercise.name}
                    onPlayingChange={handlePlayingChange}
                  />
                </div>
              )}
              <p className="text-base text-white/70 text-center leading-relaxed">
                {exercise.instruction}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="flow"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="absolute inset-0 flex flex-col items-center pt-safe"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.x < -50 || velocity.x < -500) {
                setShowTutorial(true);
              }
            }}
          >
            {/* Top Bar */}
            <div className="w-full flex justify-between items-center px-4 h-12 shrink-0">
              <button
                onClick={() => setShowQuitConfirm(true)}
                className="p-2 -ml-2 text-white/40 active:text-white transition-colors"
                aria-label="Quit mobility"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  {exerciseIndex + 1} OF {totalExercises}
                </span>
                <span className="text-xs font-black uppercase text-white">
                  {side ? `${side} SIDE` : 'MOBILITY'}
                </span>
              </div>

              <button
                onClick={() => setShowTutorial(true)}
                className="p-2 -mr-2 text-white/40 active:text-white transition-colors"
                aria-label="How to do this exercise"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>

            {/* Core Display */}
            <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 px-6">
              <h1 className="text-fluid-exercise font-black uppercase tracking-tight text-white/80 text-center mb-4 leading-tight">
                {exercise.name}
              </h1>

              <div className="flex items-center justify-center relative">
                <span
                  className={cn(
                    "font-mono leading-none font-black tabular-nums transition-all duration-300 text-fluid-timer",
                    isPaused ? "opacity-30" : "text-white"
                  )}
                >
                  {timer}
                </span>
              </div>
            </div>

            {/* Bottom Action Buttons - Stacked */}
            <div className="w-full px-4 mb-4 pb-safe shrink-0 flex flex-col gap-3 mt-auto">
              <Button
                onClick={onSkip}
                className="w-full btn-fluid rounded-full font-black uppercase tracking-tight bg-white text-black active:scale-95 transition-all shadow-xl"
              >
                Skip Exercise
              </Button>

              <Button
                variant="outline"
                onClick={isPaused ? onResume : onPause}
                className="w-full h-11 sm:h-12 rounded-full text-xs font-black uppercase tracking-widest bg-white/5 border-0 text-white/40 active:bg-white/10 active:scale-95 transition-all"
              >
                {isPaused ? 'Resume' : 'Pause Session'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <QuitConfirmDialog
        open={showQuitConfirm}
        onOpenChange={setShowQuitConfirm}
        onConfirm={onQuit}
      />
    </div>
  );
}
