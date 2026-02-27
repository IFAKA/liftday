'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dumbbell, Play, CheckCircle, Flame, ChartBar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExerciseScreen } from '@/components/ExerciseScreen';
import { RestTimer } from '@/components/RestTimer';
import { ExerciseTransition } from '@/components/ExerciseTransition';
import { SessionComplete } from '@/components/SessionComplete';
import { RestDayScreen } from '@/components/RestDayScreen';
import { Onboarding } from '@/components/Onboarding';
import { WeeklySplit } from '@/components/WeeklySplit';
import { HistoryScreen } from '@/components/HistoryScreen';
import { useWorkout } from '@/hooks/useWorkout';
import { useSchedule } from '@/hooks/useSchedule';
import { useMobility } from '@/hooks/useMobility';
import { formatDisplayDate, getWeekNumber } from '@/lib/workout-utils';
import { getFirstSessionDate, saveUserProfile, getDefaultProfile, buildMigratedProfile } from '@/lib/storage';
import { getWorkoutType, getTrainingStreak } from '@/lib/schedule';
import { USER_PROFILE_KEY } from '@/lib/constants';

const ONBOARDING_KEY = 'liftday_onboarding_completed';

export function TodayScreen() {
  const [mounted, setMounted] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_KEY);
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    } else {
      // Migration: existing user who predates the profile system
      const hasProfile = localStorage.getItem(USER_PROFILE_KEY);
      if (!hasProfile) {
        saveUserProfile(buildMigratedProfile());
      }
    }
  }, []);

  const today = useMemo(() => {
    if (!mounted) return null;
    return new Date();
  }, [mounted]);

  const handleCompleteOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    saveUserProfile(getDefaultProfile());
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    return <Onboarding onComplete={handleCompleteOnboarding} />;
  }

  if (!today) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-background">
        <Dumbbell className="w-8 h-8 animate-pulse" />
      </div>
    );
  }

  return <TodayContent date={today} />;
}

function TodayContent({ date }: { date: Date }) {
  const workout = useWorkout(date);
  const schedule = useSchedule(date, workout.data);
  const mobility = useMobility();
  const firstSession = getFirstSessionDate();
  const weekNumber = getWeekNumber(firstSession, date);
  const workoutType = getWorkoutType(date);
  const streak = getTrainingStreak(date, workout.data);
  const [showHistory, setShowHistory] = useState(false);

  // History screen
  if (showHistory) {
    return (
      <HistoryScreen
        data={workout.data}
        currentDate={date}
        onBack={() => setShowHistory(false)}
      />
    );
  }

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
        exerciseIndex={workout.exerciseIndex}
        totalExercises={workout.totalExercises}
        currentSet={workout.currentSet}
        setsPerExercise={workout.setsPerExercise}
        currentTarget={workout.currentTarget}
        previousRep={workout.previousRep}
        flashColor={workout.flashColor}
        onLogSet={workout.logSet}
        onQuit={workout.quitWorkout}
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
        onPauseToggle={workout.togglePauseTimer}
        onSkip={workout.skipTimer}
        onQuit={workout.quitWorkout}
        onUndo={workout.undoLastSet}
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
        onDone={workout.quitWorkout}
      />
    );
  }

  // Idle — ready to start (or already done today)
  const isDone = schedule.isDone;
  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      {/* Top content */}
      <div className="flex flex-col items-center flex-shrink-0 px-6 pt-12 pb-4 gap-5">
        {/* History button top-right */}
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setShowHistory(true)}
            className="p-2 rounded-full hover:bg-muted active:scale-95 transition-all text-muted-foreground hover:text-foreground"
            aria-label="View history"
          >
            <ChartBar className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          {isDone ? (
            <CheckCircle
              className="w-10 h-10 text-green-500"
              style={{ animation: 'bounce-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1) backwards' }}
            />
          ) : (
            <Dumbbell
              className="w-10 h-10"
              style={{ animation: 'bounce-in 600ms ease-out backwards' }}
            />
          )}
          <h1 className="text-2xl font-bold tracking-tight uppercase text-foreground">
            {workoutType === 'push' ? 'PUSH' : workoutType === 'pull' ? 'PULL' : 'LEGS'}
          </h1>
          <p className="text-sm text-muted-foreground">{formatDisplayDate(date)}</p>
        </div>

        <div
          className="flex items-center gap-3 text-sm text-muted-foreground"
          style={{ animation: 'stagger-in 400ms ease-out 200ms backwards' }}
        >
          <span className="font-mono">WEEK {weekNumber}</span>
          <span>·</span>
          <span className="font-mono">{workout.setsPerExercise} SETS</span>
          {streak > 0 && (
            <>
              <span>·</span>
              <div className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="font-mono text-orange-500">{streak}</span>
              </div>
            </>
          )}
        </div>

        {!isDone && (
          <Button
            size="lg"
            onClick={workout.startWorkout}
            className="rounded-full w-20 h-20 animate-pulse active:scale-95 transition-transform"
          >
            <Play className="w-10 h-10" />
          </Button>
        )}
      </div>

      {/* Weekly Split — scrollable */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <WeeklySplit currentDate={date} data={workout.data} />
      </div>
    </div>
  );
}
