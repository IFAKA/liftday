'use client';

import { Moon, Play } from 'lucide-react';
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
    <div className="flex flex-col items-center justify-center h-[100dvh] bg-black p-safe relative overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <Moon className="w-20 h-20 text-white/30 mb-8" />
        <h1 className="text-[64px] sm:text-[80px] font-black tracking-tighter uppercase text-white leading-none mb-4 text-center">
          REST
        </h1>
        {nextTraining && (
          <p className="text-sm font-bold text-white/40 uppercase tracking-widest mt-2 px-6 text-center">
            NEXT: {nextTraining}
          </p>
        )}
      </div>

      <div className="w-full absolute bottom-8 px-4 z-10">
        <Button
          size="lg"
          onClick={mobility.startMobility}
          className="w-full h-[68px] rounded-full text-xl font-black uppercase tracking-tight bg-[#1A1A1A] text-white hover:bg-[#2A2A2A] active:scale-95 transition-all shadow-lg border border-white/10"
        >
          <Play className="w-5 h-5 mr-3 fill-current" />
          5 MIN MOBILITY
        </Button>
      </div>
    </div>
  );
}
