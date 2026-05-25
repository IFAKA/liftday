'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, ChevronLeft, Info } from 'lucide-react';
import { Button } from './ui/button';
import { TopBar } from './TopBar';
import { Progress } from './ui/progress';
import { QuitConfirmDialog } from './QuitConfirmDialog';
import { MobilityExercise } from '@/lib/types';
import { ExerciseDemo } from './ExerciseDemo';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { traceLiftDay } from '@/lib/debug-trace';

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
  const shouldReduceMotion = useReducedMotion();

  const progressPercent = (exerciseIndex / totalExercises) * 100;

  useEffect(() => {
    showQuitConfirmRef.current = showQuitConfirm;
  }, [showQuitConfirm]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowTutorial(false);
  }, [exerciseIndex]);

  useEffect(() => {
    traceLiftDay('mobility.render', {
      exerciseIndex,
      exerciseName: exercise.name,
      side,
      timer,
      showTutorial,
    });
  }, [exercise.name, exerciseIndex, side, showTutorial, timer]);

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
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col px-safe pb-safe">
      <Progress
        value={progressPercent}
        className="absolute top-0 left-0 right-0 h-1 rounded-none bg-white/10 z-50 [&_[data-slot=progress-indicator]]:bg-white"
      />

      <div className="absolute inset-0 flex flex-col items-center">
        <TopBar
          leftAction={
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowQuitConfirm(true)}
              className="-ml-2 text-white/40 hover:text-white hover:bg-transparent active:text-white"
              aria-label="Quit mobility"
            >
              <X className="w-5 h-5" />
            </Button>
          }
          center={
            <div className="flex flex-col items-center">
              <span className="text-fluid-label font-bold uppercase tracking-widest text-white/40">
                {exerciseIndex + 1} OF {totalExercises}
              </span>
              <span className="text-fluid-ui font-black uppercase text-white">
                {side ? `${side} SIDE` : 'MOBILITY'}
              </span>
            </div>
          }
          rightAction={
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTutorial(true)}
              className="-mr-2 text-white/40 hover:text-white hover:bg-transparent active:text-white"
              aria-label="How to do this exercise"
            >
              <Info className="w-5 h-5" />
            </Button>
          }
        />

        <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 px-6">
          <h1 className="text-fluid-exercise font-black uppercase tracking-tight text-white/80 text-center mb-4 leading-tight">
            {exercise.name}
          </h1>

          <span
            className={`font-mono leading-none font-black tabular-nums transition-opacity duration-150 ease-[var(--ease-out-ui)] text-fluid-timer text-white${isPaused ? ' opacity-30' : ''}`}
          >
            {timer}
          </span>
        </div>

        <div className="w-full px-4 pb-safe mb-4 shrink-0 flex flex-col gap-4">
          <Button
            onClick={onSkip}
            className="w-full btn-mobile-accessible rounded-full font-black uppercase tracking-tight bg-white text-black active:scale-95 transition-transform duration-150 ease-[var(--ease-out-ui)] shadow-xl"
          >
            Skip Exercise
          </Button>

          <Button
            variant="outline"
            onClick={isPaused ? onResume : onPause}
            className="w-full btn-mobile-secondary rounded-full text-fluid-label font-black uppercase tracking-widest bg-white/5 border-0 text-white/40 active:bg-white/10 active:scale-95 transition-[background-color,color,transform] duration-150 ease-[var(--ease-out-ui)]"
          >
            {isPaused ? 'Resume' : 'Pause Session'}
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showTutorial && (
          <motion.div
            key="tutorial"
            initial={{
              opacity: shouldReduceMotion ? 0 : 1,
              transform: shouldReduceMotion ? 'translateX(0)' : 'translateX(100%)',
            }}
            animate={{ opacity: 1, transform: 'translateX(0)' }}
            exit={{
              opacity: shouldReduceMotion ? 0 : 1,
              transform: shouldReduceMotion ? 'translateX(0)' : 'translateX(100%)',
            }}
            transition={{ duration: shouldReduceMotion ? 0.18 : 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="absolute inset-0 z-40 bg-black flex flex-col"
          >
            <TopBar
              leftAction={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowTutorial(false)}
                  className="-ml-2 text-white hover:bg-white/10 hover:text-white"
                  aria-label="Back to mobility"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
              }
            />

            <div className="flex-1 overflow-y-auto px-6 pb-8 flex flex-col items-center">
              <h2 className="text-fluid-exercise font-black uppercase tracking-tight text-white mb-6 text-center">
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
              <p className="text-fluid-label text-white/70 text-center leading-relaxed">
                {exercise.instruction}
              </p>
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
