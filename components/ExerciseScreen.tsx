'use client';

import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, ChevronLeft, Info } from 'lucide-react';
import { Button } from './ui/button';
import type { Exercise } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ExerciseDemo } from './ExerciseDemo';
import { QuitConfirmDialog } from './QuitConfirmDialog';
import { NumberInput } from './NumberInput';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [val, setVal] = useState(currentTarget);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowQuitConfirm(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVal(currentTarget);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowTutorial(false);
  }, [exerciseIndex, currentSet, currentTarget]);

  useEffect(() => {
    const handlePopState = () => {
      if (showTutorial) {
        setShowTutorial(false);
      } else {
        setShowQuitConfirm(true);
      }
      window.history.pushState({ exercise: true }, '');
    };
    window.history.pushState({ exercise: true }, '');
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showTutorial]);

  // Overall workout progress percentage
  const totalSets = totalExercises * setsPerExercise;
  const completedSets = exerciseIndex * setsPerExercise + currentSet;
  const progressPercent = (completedSets / totalSets) * 100;

  return (
    <div className="relative w-full h-[100dvh] bg-black overflow-hidden flex flex-col">
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
            className="absolute inset-0 z-40 bg-black flex flex-col p-safe"
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
            <div className="p-4 flex items-center shrink-0">
              <button
                onClick={() => setShowTutorial(false)}
                className="w-12 h-12 flex items-center justify-center -ml-2 rounded-full active:bg-white/10 text-white transition-colors"
                aria-label="Back to workout"
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
                  <ExerciseDemo youtubeId={exercise.youtubeId} title={exercise.name} />
                </div>
              )}
              <p className="text-sm text-white/70 text-center leading-relaxed">
                {exercise.instruction}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="logging"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className={cn(
              'absolute inset-0 flex flex-col items-center p-safe transition-colors duration-500',
              flashColor === 'green' && 'bg-green-950/40',
              flashColor === 'red' && 'bg-red-950/40'
            )}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.x < -50 || velocity.x < -500) {
                setShowTutorial(true);
              }
            }}
          >
            {/* Top Bar for Logging View */}
            <div className="w-full flex justify-between items-start p-2 sm:p-4 shrink-0 mt-1 sm:mt-2">
              <button
                onClick={() => setShowQuitConfirm(true)}
                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20 transition-colors"
                aria-label="Quit workout"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              <div className="flex flex-col items-center mt-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                  {exercise.name}
                </span>
                <span className="text-xs sm:text-sm font-black uppercase tracking-tighter text-white">
                  SET {currentSet + 1} OF {setsPerExercise}
                </span>
              </div>

              <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center relative">
                <button
                  onClick={() => setShowTutorial(true)}
                  className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-white/50 active:text-white transition-colors"
                  aria-label="How to do this exercise"
                >
                  <Info className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                {/* Swipe hint dot */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
              </div>
            </div>

            {/* Core Input */}
            <div className="flex-1 flex flex-col items-center justify-center w-full relative min-h-0">
              <NumberInput
                key={`${exerciseIndex}-${currentSet}`}
                defaultValue={currentTarget}
                max={exercise.unit === 'seconds' ? 120 : 40}
                label={exercise.unit === 'seconds' ? 'Seconds held' : 'Reps done'}
                onChange={setVal}
              />

              {previousRep !== null && (
                <div className="absolute bottom-8 flex items-center gap-2 text-white/50 bg-white/5 px-4 py-1.5 rounded-full">
                  {flashColor === 'green' ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : flashColor === 'red' ? (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  ) : (
                    <div className="w-4 h-px bg-white/50" />
                  )}
                  <span className="text-xs font-mono font-bold tracking-widest">{previousRep} PREV</span>
                </div>
              )}
            </div>

            {/* Bottom Action Button */}
            <div className="w-full px-4 mb-4 shrink-0 z-10">
              <Button
                onClick={() => onLogSet(val)}
                className="w-full h-[54px] sm:h-[68px] rounded-full text-xl sm:text-2xl font-black shadow-lg uppercase tracking-tight bg-white text-black hover:bg-white/90 active:scale-95 transition-all"
              >
                LOG SET
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
