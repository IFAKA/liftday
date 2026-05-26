'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { Activity, CalendarDays, ChartBar, Moon, Play, Settings } from 'lucide-react';
import { MobilityFlow } from './MobilityFlow';
import { MobilityErrorBoundary } from './MobilityErrorBoundary';
import { SessionComplete } from './SessionComplete';
import { DailyLog, MobilityExercise } from '@/lib/types';
import { WatchListItem, WatchPrimaryAction } from './WatchSurface';
import { loadDailyLogs } from '@/lib/storage';
import { RestDayActionRow, WaistMeasurementPanel } from './rest-day/RestDayPanels';

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
  weekCompleted: number;
  weekTotal: number;
  mobility: MobilityHookState;
}

export function RestDayScreen({ date, nextTraining, weekCompleted, weekTotal, mobility }: RestDayScreenProps) {
  const [dailyLogs, setDailyLogs] = useState<Record<string, DailyLog>>(() => loadDailyLogs());
  const isSunday = date.getDay() === 0;
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDailyLogs(loadDailyLogs());
  }, []);

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
    <div className="flex h-full flex-col items-center overflow-hidden bg-black px-safe pt-safe pb-safe">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-end w-full px-4 py-3">
        <Moon className="w-12 h-12 sm:w-16 sm:h-16 text-white/30 mb-3 sm:mb-4" />
        <h1 className="text-fluid-title font-black uppercase text-white leading-none mb-2 text-center">
          REST
        </h1>
        {nextTraining && (
          <p className="text-fluid-label font-bold text-white/40 uppercase px-6 text-center">
            NEXT: {nextTraining}
          </p>
        )}
      </div>

      <div className="w-full shrink-0 px-4 pb-4 sm:pb-6 flex flex-col">
        <RestDayActionRow shouldReduceMotion={shouldReduceMotion} className="mb-2">
          <WatchListItem
            href="/muscles"
            icon={Activity}
            title="Muscles"
            subtitle="What is working"
            subtle
            className="py-3"
          />
        </RestDayActionRow>
        <RestDayActionRow shouldReduceMotion={shouldReduceMotion} className="mb-2">
          <WatchListItem
            href="/program"
            icon={CalendarDays}
            title="Program"
            subtitle="Routine"
            subtle
            className="py-3"
          />
        </RestDayActionRow>
        <RestDayActionRow shouldReduceMotion={shouldReduceMotion} className="mb-2">
          <WatchListItem
            href="/history"
            icon={ChartBar}
            title="Progress"
            subtitle="Changes and attention"
            subtle
            className="py-3"
          />
        </RestDayActionRow>
        <RestDayActionRow shouldReduceMotion={shouldReduceMotion} className="mb-2">
          <WatchListItem
            href="/settings"
            icon={Settings}
            title="Options"
            subtitle="Routine, body, sync"
            subtle
            className="py-3"
          />
        </RestDayActionRow>
        {isSunday && (
          <WaistMeasurementPanel
            date={date}
            logs={dailyLogs}
            onLogsChange={setDailyLogs}
          />
        )}
        <RestDayActionRow shouldReduceMotion={shouldReduceMotion}>
          <WatchPrimaryAction
            onClick={mobility.startMobility}
            className="shadow-xl"
          >
            <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 fill-current" />
            5 MIN MOBILITY
          </WatchPrimaryAction>
        </RestDayActionRow>
      </div>
    </div>
  );
}
