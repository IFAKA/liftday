'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, Info } from 'lucide-react';
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

import { TopBar } from './TopBar';

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
    setVal(currentTarget);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowQuitConfirm(false);
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

  const totalSets = totalExercises * setsPerExercise;
  const completedSets = exerciseIndex * setsPerExercise + currentSet;
  const progressPercent = (completedSets / totalSets) * 100;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col">
      {/* Subtle Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 z-50">
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
            className="absolute inset-0 z-40 bg-black flex flex-col"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.x > 30 || velocity.x > 400) setShowTutorial(false);
            }}
          >
            <TopBar
              leftAction={
                <button onClick={() => setShowTutorial(false)} className="p-2 -ml-2 text-white active:bg-white/10 rounded-full">
                  <ChevronLeft className="w-6 h-6" />
                </button>
              }
              center={<span className="text-[10px] font-black uppercase tracking-tight truncate w-full text-center px-2">{exercise.name}</span>}
            />

            <div className="flex-1 overflow-y-auto px-2 pb-4 flex flex-col items-center">
              {exercise.youtubeId && (
                <div className="w-full aspect-video mb-3 rounded-lg overflow-hidden bg-white/5 shrink-0">
                  <ExerciseDemo youtubeId={exercise.youtubeId} title={exercise.name} />
                </div>
              )}
              <p className="text-[11px] text-white/70 text-center leading-snug">
                {exercise.instruction}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="logging"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'absolute inset-0 flex flex-col items-center transition-colors duration-500',
              flashColor === 'green' && 'bg-green-950/40',
              flashColor === 'red' && 'bg-red-950/40'
            )}
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.1}
            onDragEnd={(e, { offset, velocity }) => {
              // Horizontal: Swipe left for tutorial
              if (offset.x < -40 || velocity.x < -400) {
                setShowTutorial(true);
              }
              // Vertical: Swipe down to quit
              if (offset.y > 60 || velocity.y > 600) {
                setShowQuitConfirm(true);
              }
            }}
          >
            <TopBar
              leftAction={
                <button onClick={() => setShowQuitConfirm(true)} className="p-2 -ml-2 text-white/50 active:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              }
              center={
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/40 truncate w-24 text-center">{exercise.name}</span>
                  <span className="text-[10px] font-black uppercase text-white -mt-0.5">SET {currentSet + 1}/{setsPerExercise}</span>
                </div>
              }
              rightAction={
                <button onClick={() => setShowTutorial(true)} className="p-2 -mr-2 text-white/50 active:text-white transition-colors">
                  <Info className="w-5 h-5" />
                </button>
              }
            />

            <div className="flex-1 flex flex-col items-center justify-center w-full relative min-h-0">
              <NumberInput
                key={`${exerciseIndex}-${currentSet}`}
                defaultValue={currentTarget}
                max={exercise.unit === 'seconds' ? 120 : 40}
                label={exercise.unit === 'seconds' ? 'Seconds' : 'Reps'}
                onChange={setVal}
              />

              {previousRep !== null && !flashColor && (
                <div className="absolute bottom-2 flex items-center gap-1.5 text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
                  <span className="text-[9px] font-mono font-bold tracking-widest">{previousRep} PREV</span>
                </div>
              )}
            </div>

            <div className="w-full px-2 pb-2 shrink-0 z-10">
              <Button
                onClick={() => onLogSet(val)}
                className="w-full h-11 rounded-full text-lg font-black uppercase tracking-tight bg-white text-black active:scale-95 transition-all"
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
