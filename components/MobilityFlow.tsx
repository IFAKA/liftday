'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Pause, Play, SkipForward, X, ChevronLeft, Info } from 'lucide-react';
import { Button } from './ui/button';
import { QuitConfirmDialog } from './QuitConfirmDialog';
import { MobilityExercise } from '@/lib/types';
import { ExerciseDemo } from './ExerciseDemo';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="relative w-full h-[100dvh] bg-black overflow-hidden flex flex-col p-safe">
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
            className="absolute inset-0 z-40 bg-black flex flex-col pt-4"
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
            <div className="px-4 flex items-center shrink-0 mb-4">
              <button
                onClick={() => setShowTutorial(false)}
                className="w-12 h-12 flex items-center justify-center -ml-2 rounded-full active:bg-white/10 text-white transition-colors"
                aria-label="Back to mobility"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
            </div>

            {/* Tutorial Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-8 flex flex-col items-center">
              <h2 className="text-xl font-bold uppercase tracking-tight text-white mb-6 text-center">
                {exercise.name}
              </h2>
              {exercise.youtubeId && (
                <div className="w-full max-w-md aspect-video mb-6 rounded-2xl overflow-hidden bg-white/5">
                  <ExerciseDemo
                    youtubeId={exercise.youtubeId}
                    title={exercise.name}
                    onPlayingChange={handlePlayingChange}
                  />
                </div>
              )}
              <p className="text-sm text-white/70 text-center leading-relaxed">
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
            className="absolute inset-0 flex flex-col items-center"
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
            <div className="w-full flex justify-between items-start p-4 shrink-0 mt-2">
              <button
                onClick={() => setShowQuitConfirm(true)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20 transition-colors"
                aria-label="Quit mobility"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col items-center mt-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                  {exerciseIndex + 1} OF {totalExercises}
                </span>
                <span className="text-sm font-black uppercase tracking-tighter text-white">
                  {side ? `${side} SIDE` : 'MOBILITY'}
                </span>
              </div>

              <div className="w-10 h-10 flex items-center justify-center relative">
                <button
                  onClick={() => setShowTutorial(true)}
                  className="w-10 h-10 flex items-center justify-center rounded-full text-white/50 active:text-white transition-colors"
                  aria-label="How to do this exercise"
                >
                  <Info className="w-6 h-6" />
                </button>
                {/* Swipe hint dot */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
              </div>
            </div>

            {/* Core Display */}
            <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 px-4">
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white/70 text-center mb-6">
                {exercise.name}
              </h1>

              <div className="flex items-center justify-center relative">
                <span
                  className={`text-[120px] sm:text-[140px] font-mono leading-none font-black tabular-nums transition-opacity duration-300 ${
                    isPaused ? 'opacity-40 text-white' : 'text-white'
                  }`}
                >
                  {timer}
                </span>
              </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="w-full px-4 mb-8 shrink-0 flex gap-3 mt-auto">
              <Button
                variant="outline"
                onClick={isPaused ? onResume : onPause}
                className="flex-1 rounded-full h-[68px] text-lg font-black uppercase tracking-tight bg-[#1A1A1A] border-0 text-white hover:bg-[#2A2A2A] active:scale-95 transition-all"
              >
                {isPaused ? <Play className="w-6 h-6 mr-2 fill-current" /> : <Pause className="w-6 h-6 mr-2 fill-current" />}
                {isPaused ? 'Resume' : 'Pause'}
              </Button>

              <Button
                onClick={onSkip}
                className="flex-[1.5] rounded-full h-[68px] text-lg font-black uppercase tracking-tight bg-white text-black hover:bg-white/90 active:scale-95 transition-all shadow-lg"
              >
                <SkipForward className="w-6 h-6 mr-2 fill-current" />
                Skip
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
