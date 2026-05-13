'use client';

import { CalendarDays, ChartBar, Moon, Play } from 'lucide-react';
import { Button } from './ui/button';
import { MobilityFlow } from './MobilityFlow';
import { MobilityErrorBoundary } from './MobilityErrorBoundary';
import { SessionComplete } from './SessionComplete';
import { MobilityExercise } from '@/lib/types';
import { WatchListItem } from './WatchSurface';

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
      <MobilityErrorBoundary onSkip={mobility.skip} onQuit={mobility.quit}>
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
      </MobilityErrorBoundary>
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
    <div className="flex h-full flex-col items-center justify-center overflow-hidden bg-black px-safe pt-safe pb-safe">
      <div className="flex-1 flex flex-col items-center justify-center w-full px-4">
        <Moon className="w-16 h-16 sm:w-20 sm:h-20 text-white/30 mb-5 sm:mb-6" />
        <h1 className="text-fluid-title font-black uppercase text-white leading-none mb-4 text-center">
          REST
        </h1>
        {nextTraining && (
          <p className="text-fluid-label font-bold text-white/40 uppercase px-6 text-center">
            NEXT: {nextTraining}
          </p>
        )}
      </div>

      <div className="w-full shrink-0 px-4 pb-4 sm:pb-6 flex flex-col gap-2">
        <WatchListItem
          href="/program"
          icon={CalendarDays}
          title="Program"
          subtitle="Routine and next days"
          subtle
          className="py-3"
        />
        <WatchListItem
          href="/history"
          icon={ChartBar}
          title="Progress"
          subtitle="Changes and attention"
          subtle
          className="py-3"
        />
        <Button
          onClick={mobility.startMobility}
          className="w-full btn-mobile-accessible rounded-full font-black uppercase tracking-tight bg-white text-black hover:bg-white/90 active:scale-95 transition-all shadow-xl"
        >
          <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 fill-current" />
          5 MIN MOBILITY
        </Button>
      </div>
    </div>
  );
}
