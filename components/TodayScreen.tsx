'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, AlertTriangle, CalendarDays, ChartBar, CheckCircle, Dumbbell, Flame, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExerciseScreen } from '@/components/ExerciseScreen';
import { RestTimer } from '@/components/RestTimer';
import { ExerciseTransition } from '@/components/ExerciseTransition';
import { SessionComplete } from '@/components/SessionComplete';
import { RestDayScreen } from '@/components/RestDayScreen';
import { useWorkout } from '@/hooks/useWorkout';
import { useSchedule } from '@/hooks/useSchedule';
import { useMobility } from '@/hooks/useMobility';
import { formatDisplayDate } from '@/lib/workout-utils';
import { formatWorkoutType, getWorkoutType, getTrainingStreak } from '@/lib/schedule';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { TopBar } from './TopBar';
import { WatchListItem, WatchPanel } from './WatchSurface';

const ONBOARDING_KEY = 'liftday_onboarding_completed';

export function TodayScreen() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_KEY);
    if (!hasSeenOnboarding) {
      router.replace('/onboarding');
    }
  }, [router]);

  const today = useMemo(() => {
    if (!mounted) return null;
    return new Date();
  }, [mounted]);

  if (!today) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-black">
        <Dumbbell className="w-8 h-8 text-white/50 animate-pulse" />
      </div>
    );
  }

  return <TodayContent date={today} />;
}

function TodayContent({ date }: { date: Date }) {
  const [startError, setStartError] = useState<string | null>(null);
  const workout = useWorkout(date);
  const schedule = useSchedule(date, workout.data);
  const mobility = useMobility();
  const workoutType = getWorkoutType(date);
  const streak = getTrainingStreak(date, workout.data);

  // Rest day
  if (!schedule.isTraining) {
    return (
      <RestDayScreen
        nextTraining={schedule.nextTraining}
        weekCompleted={schedule.weekProgress.completed}
        weekTotal={schedule.weekProgress.total}
        mobility={mobility}
      />
    );
  }

  // Workout in progress
  if (workout.state === 'exercising') {
    return (
      <ExerciseScreen
        exercise={workout.currentExercise!}
        totalPlannedSets={workout.totalPlannedSets}
        completedPlannedSets={workout.completedPlannedSets}
        currentSet={workout.currentSet}
        setsPerExercise={workout.setsPerExercise}
        currentTarget={workout.currentTarget}
        currentWeightTarget={workout.currentWeightTarget}
        prescription={workout.currentPrescription}
        previousRep={workout.previousRep}
        previousWeight={workout.previousWeight}
        coachingReference={workout.coachingReference}
        currentExerciseSets={workout.sessionReps[workout.currentExercise!.key] ?? []}
        flashColor={workout.flashColor}
        onLogSet={workout.logSet}
        onQuit={workout.quitWorkout}
        onMachineOccupied={workout.handleMachineOccupied}
        swapAlternatives={workout.swapAlternatives}
        onSelectAlternative={workout.selectAlternativeForOccupied}
        canDeferMachineOccupied={workout.canDeferMachineOccupied}
      />
    );
  }

  if (workout.state === 'transitioning') {
    return (
      <ExerciseTransition
        exerciseName={workout.nextExerciseName}
        onComplete={workout.finishTransition}
      />
    );
  }

  if (workout.state === 'resting') {
    return (
      <RestTimer
        seconds={workout.timer}
        isPaused={workout.timerPaused}
        onSkip={workout.skipTimer}
        onQuit={workout.quitWorkout}
        onUndo={workout.undoLastSet}
nextExerciseName={workout.nextExerciseAfterRestName}
      />
    );
  }

  if (workout.state === 'complete') {
    return (
      <SessionComplete
        mode="workout"
        sessionReps={workout.sessionReps}
        data={workout.data}
        date={date}
        advancedTiers={workout.advancedTiers}
        onDone={workout.quitWorkout}
      />
    );
  }

  // Idle — ready to start (or already done today)
  const isDone = schedule.isDone;
  return (
    <motion.div
      className="flex flex-col h-full overflow-hidden bg-black relative"
    >
      <TopBar
        center={
          <span className="text-fluid-label font-mono font-black text-white/70 uppercase tracking-widest">
            {formatDisplayDate(date)}
          </span>
        }
      />

      <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-8">
        {isDone ? (
          <div className="flex flex-col items-center">
            <CheckCircle className="w-16 h-16 text-green-500 mb-5" />
            <h1 className="text-fluid-title font-black uppercase text-white leading-none">
              DONE
            </h1>
          </div>
        ) : (
          <>
            <h1 className="text-fluid-title font-black uppercase text-white leading-none text-center">
              {formatWorkoutType(workoutType)}
            </h1>
            {streak > 0 && (
              <Badge variant="ghost" className="mt-3 rounded-full bg-orange-500/10 border-orange-500/20 text-fluid-label font-black text-orange-500 uppercase">
                <Flame className="w-4 h-4 text-orange-500" />
                {streak} DAY STREAK
              </Badge>
            )}
          </>
        )}
      </div>

      <div className="w-full px-4 mb-3 flex flex-col gap-2">
        <WatchListItem
          href="/muscles"
          icon={Activity}
          title="Muscles"
          subtitle="What is working"
          subtle
          className="py-3"
        />
        <WatchListItem
          href="/program"
          icon={CalendarDays}
          title="Program"
          subtitle="Routine"
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
        <WatchListItem
          href="/settings"
          icon={Settings}
          title="Options"
          subtitle="Routine, body, sync"
          subtle
          className="py-3"
        />
      </div>

      {!isDone && (
        <>
          {startError && (
            <div className="w-full px-4 mb-3">
              <WatchPanel className="border-red-500/40 bg-red-500/10 py-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
                  <p className="text-fluid-label font-black uppercase leading-tight text-red-100">
                    {startError}
                  </p>
                </div>
              </WatchPanel>
            </div>
          )}
          {workout.exercises[0] && workout.currentPrescription && (
            <div className="w-full px-4 mb-3">
              <WatchPanel subtle className="py-3">
                <p className="text-fluid-label text-zinc-500 uppercase font-mono">Next</p>
                <p className="mt-1 truncate text-fluid-label font-black uppercase text-white">
                  {workout.exercises[0].name}
                </p>
                <p className="mt-1 text-fluid-label font-mono uppercase text-white/35">
                  {workout.currentPrescription.sets}x{workout.currentPrescription.minReps}-{workout.currentPrescription.maxReps} · {workout.currentPrescription.targetRir}
                </p>
              </WatchPanel>
            </div>
          )}
          <div className="w-full px-4 pb-safe mb-4 shrink-0">
            <Button
              onClick={() => {
                setStartError(null);
                workout.startWorkout().catch((error: unknown) => {
                  setStartError(error instanceof Error ? error.message : 'Workout start failed.');
                });
              }}
              className="w-full btn-mobile-accessible rounded-full bg-white text-black active:scale-95 transition-all font-black uppercase tracking-tight shadow-xl"
            >
              Start
            </Button>
          </div>
        </>
      )}
    </motion.div>
  );
}
