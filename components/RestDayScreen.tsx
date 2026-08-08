'use client';

import { useReducedMotion } from 'motion/react';
import { Moon, Play } from 'lucide-react';
import { MobilityFlow } from './MobilityFlow';
import { MobilityErrorBoundary } from './MobilityErrorBoundary';
import { MobilityExercise } from '@/lib/types';
import { WatchPrimaryAction, WatchScreen } from './WatchSurface';
import { RestDayActionRow } from './rest-day/RestDayPanels';
import { TodayNavList } from './today/TodayNavList';

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
  date: Date;
  nextTraining: string | null;
  mobility: MobilityHookState;
}

export function RestDayScreen({ nextTraining, mobility }: RestDayScreenProps) {
  const shouldReduceMotion = useReducedMotion();

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

  return (
    <WatchScreen
      scrollable={false}
      bodyClassName="flex flex-col items-center justify-center pt-safe py-3"
      footer={(
        <>
          <TodayNavList />
          <RestDayActionRow shouldReduceMotion={shouldReduceMotion}>
            <WatchPrimaryAction
              onClick={mobility.startMobility}
              disabled={mobility.isComplete}
              aria-label={mobility.isComplete ? 'Mobility done' : '5 min mobility'}
              className="shadow-xl"
            >
              <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 fill-current" />
              {mobility.isComplete ? 'MOBILITY DONE' : '5 MIN MOBILITY'}
            </WatchPrimaryAction>
          </RestDayActionRow>
        </>
      )}
      footerClassName="mb-4 flex flex-col gap-2 sm:mb-6"
    >
        <Moon className="w-12 h-12 sm:w-16 sm:h-16 text-white/30 mb-3 sm:mb-4" />
        <h1 className="text-fluid-title font-black uppercase text-white leading-none mb-2 text-center">
          REST
        </h1>
        {nextTraining && (
          <p className="text-fluid-label font-bold text-white/40 uppercase px-6 text-center">
            NEXT: {nextTraining}
          </p>
        )}
    </WatchScreen>
  );
}
