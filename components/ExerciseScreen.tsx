'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import type { Exercise } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ExerciseDemo } from './ExerciseDemo';
import { QuitConfirmDialog } from './QuitConfirmDialog';
import { NumberInput } from './NumberInput';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from './ui/badge';
import { TopBar } from './TopBar';

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
      <Progress
        value={progressPercent}
        className="absolute top-0 left-0 right-0 h-0.5 rounded-none bg-white/10 z-50 [&_[data-slot=progress-indicator]]:bg-white [&_[data-slot=progress-indicator]]:transition-all [&_[data-slot=progress-indicator]]:duration-500"
      />

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
            onDragEnd={(_, { offset, velocity }) => {
              if (offset.x > 30 || velocity.x > 400) setShowTutorial(false);
            }}
          >
            <TopBar
              leftAction={
                <Button variant="ghost" size="icon" onClick={() => setShowTutorial(false)} className="-ml-2 text-white hover:bg-white/10 hover:text-white">
                  <ChevronLeft className="w-6 h-6" />
                </Button>
              }
              center={<span className="text-fluid-label font-black uppercase tracking-tight truncate w-full text-center px-2">{exercise.name}</span>}
            />

            <div className="flex-1 overflow-y-auto px-4 pb-safe pb-4 flex flex-col gap-4">
              {exercise.youtubeId && (
                <div className="w-full aspect-video rounded-lg overflow-hidden bg-white/5 shrink-0">
                  <ExerciseDemo youtubeId={exercise.youtubeId} title={exercise.name} />
                </div>
              )}
              <p className="text-fluid-label text-white/70 leading-relaxed">
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
            onDragEnd={(_, { offset, velocity }) => {
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
                <Button variant="ghost" size="icon" onClick={() => setShowQuitConfirm(true)} className="-ml-2 text-white/50 hover:text-white hover:bg-transparent active:text-white">
                  <X className="w-5 h-5" />
                </Button>
              }
              center={
                <span className="text-fluid-label font-black uppercase text-white tracking-[0.15em]">
                  SET {currentSet + 1} OF {setsPerExercise}
                </span>
              }
              rightAction={
                <Button variant="ghost" size="icon" onClick={() => setShowTutorial(true)} className="-mr-2 text-white hover:bg-white/20 hover:text-white">
                  <Info className="w-6 h-6" />
                </Button>
              }
            />

            <div className="w-full px-6 pt-4 shrink-0">
              <h2 className="text-fluid-exercise font-black uppercase tracking-tighter text-white leading-tight text-center sm:text-left">
                {exercise.name}
              </h2>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full relative min-h-0">
              <NumberInput
                key={`${exerciseIndex}-${currentSet}`}
                defaultValue={currentTarget}
                max={exercise.unit === 'seconds' ? 120 : 40}
                label={exercise.unit === 'seconds' ? 'Seconds' : 'Reps'}
                onChange={setVal}
              />

              {previousRep !== null && !flashColor && (
                <Badge variant="ghost" className="absolute bottom-8 border-white/20 text-fluid-label font-mono font-bold tracking-widest">
                  {previousRep} PREVIOUS BEST
                </Badge>
              )}
            </div>

            <div className="w-full px-4 pb-safe mb-4 shrink-0 z-10">
              <Button
                onClick={() => onLogSet(val)}
                className="w-full btn-fluid rounded-full font-black uppercase tracking-tight bg-white text-black active:scale-95 transition-all shadow-xl"
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
