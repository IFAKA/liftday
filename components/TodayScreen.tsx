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
import { getFirstSessionDate, saveUserProfile, getDefaultProfile } from '@/lib/storage';
import { getWorkoutType, getTrainingStreak } from '@/lib/schedule';

const ONBOARDING_KEY = 'liftday_onboarding_completed';

export function TodayScreen() {
  const [mounted, setMounted] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    setMounted(true); // eslint-disable-line react-hooks/set-state-in-effect
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_KEY);
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
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
        advancedTiers={workout.advancedTiers}
        onDone={workout.quitWorkout}
      />
    );
  }

  // Idle — ready to start (or already done today)
  const isDone = schedule.isDone;
  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background relative p-4 pt-2 pb-6">
      {/* Top content */}
      <div className="flex flex-col items-center flex-shrink-0 w-full gap-4 mt-2">
        {/* History button top-right */}
        <div className="absolute top-2 right-2 z-20">
          <button
            onClick={() => setShowHistory(true)}
            className="p-2 rounded-full hover:bg-muted active:scale-95 transition-all text-muted-foreground/60 hover:text-foreground"
            aria-label="View history"
          >
            <ChartBar className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-1.5 text-center">
          {isDone ? (
            <CheckCircle
              className="w-10 h-10 text-green-500 mb-1"
              style={{ animation: 'bounce-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1) backwards' }}
            />
          ) : (
            <div className="relative mb-1">
              <Dumbbell
                className="w-10 h-10 text-foreground"
                style={{ animation: 'bounce-in 600ms ease-out backwards' }}
              />
            </div>
          )}
          <h1 className="text-xl font-black tracking-tighter uppercase text-foreground leading-none">
            {workoutType === 'push' ? 'PUSH' : workoutType === 'pull' ? 'PULL' : 'LEGS'}
          </h1>
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest font-mono font-medium">{formatDisplayDate(date)}</p>
        </div>

        <div
          className="flex items-center gap-2 text-[10px] text-muted-foreground/60 font-mono font-bold uppercase tracking-wider"
          style={{ animation: 'stagger-in 400ms ease-out 200ms backwards' }}
        >
          <span>WK {weekNumber}</span>
          <span className="opacity-30">|</span>
          <span>{workout.setsPerExercise} SETS</span>
          {streak > 0 && (
            <>
              <span className="opacity-30">|</span>
              <div className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500" />
                <span className="text-orange-500">{streak}</span>
              </div>
            </>
          )}
        </div>

        {!isDone && (
          <div className="flex flex-col items-center gap-4 mt-2 mb-2">
            <Button
              size="lg"
              onClick={workout.startWorkout}
              className="rounded-full w-24 h-24 shadow-xl active:scale-[0.98] transition-all bg-foreground text-background hover:bg-foreground/90 border-0"
            >
              <Play className="w-12 h-12 fill-current ml-1" />
            </Button>
            {streak > 0 && (
              <div className="flex flex-col items-center animate-pulse">
                <p className="text-[10px] text-orange-500/80 font-black tracking-[0.2em] uppercase">
                  STREAK AT RISK
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Weekly Split — scrollable, more compact for watch */}
      <div className="flex-1 overflow-y-auto w-full max-w-sm mx-auto no-scrollbar mask-fade-edges">
        <WeeklySplit currentDate={date} data={workout.data} />
      </div>
    </div>
  );
}
