'use client';

import { Moon, Play, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { MobilityFlow } from './MobilityFlow';
import { SessionComplete } from './SessionComplete';
import { MobilityExercise } from '@/lib/types';

export interface MobilityHookState {
  exercise: MobilityExercise;
  exerciseIndex: number;
  totalExercises: number;
  timer: number;
  side: 'left' | 'right' | null;
  isActive: boolean;
  isPaused: boolean;
  isComplete: boolean;
  startMobility: () => void;
  skip: () => void;
  pause: () => void;
  resume: () => void;
  quit: () => void;
}

interface RestDayScreenProps {
  nextTraining: string | null;
  weekCompleted: number;
  weekTotal: number;
  mobility: MobilityHookState;
}

export function RestDayScreen({ nextTraining, weekCompleted, weekTotal, mobility }: RestDayScreenProps) {
  if (mobility.isActive) {
    return (
      <MobilityFlow
        exercise={mobility.exercise}
        exerciseIndex={mobility.exerciseIndex}
        totalExercises={mobility.totalExercises}
        timer={mobility.timer}
        side={mobility.side}
        isPaused={mobility.isPaused}
        onSkip={mobility.skip}
        onPause={mobility.pause}
        onResume={mobility.resume}
        onQuit={mobility.quit}
      />
    );
  }

  if (mobility.isComplete) {
    return (
      <SessionComplete
        mode="mobility"
        date={new Date()}
        weekCompleted={weekCompleted}
        weekTotal={weekTotal}
        nextTraining={nextTraining}
        onDone={mobility.quit}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-[100dvh] bg-background p-6 gap-8 overflow-hidden">
      <Moon className="w-12 h-12 text-muted-foreground" />
      <h1 className="text-2xl font-bold tracking-tight">REST DAY</h1>

      <Button
        size="lg"
        onClick={mobility.startMobility}
        className="rounded-full w-16 h-16 animate-pulse active:scale-95 transition-transform"
      >
        <Play className="w-8 h-8" />
      </Button>
      <p className="text-xs text-muted-foreground">5 MIN MOBILITY</p>

      {nextTraining && (
        <p className="text-sm text-muted-foreground mt-4">
          NEXT: {nextTraining}
        </p>
      )}

      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <span className="text-sm font-mono">
          {weekCompleted}/{weekTotal} this week
        </span>
      </div>
    </div>
  );
}
