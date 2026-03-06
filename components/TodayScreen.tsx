'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dumbbell, CheckCircle, Flame, ChartBar, CalendarDays, ArrowLeft } from 'lucide-react';
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_KEY);
    if (!hasSeenOnboarding) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <div className="flex items-center justify-center h-[100dvh] bg-black">
        <Dumbbell className="w-8 h-8 text-white/50 animate-pulse" />
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
  const workoutType = getWorkoutType(date);
  const streak = getTrainingStreak(date, workout.data);
  
  const [showHistory, setShowHistory] = useState(false);
  const [showSplit, setShowSplit] = useState(false);

  // History screen overlay
  if (showHistory) {
    return (
      <HistoryScreen
        data={workout.data}
        currentDate={date}
        onBack={() => setShowHistory(false)}
      />
    );
  }

  // Weekly Split screen overlay
  if (showSplit) {
    return (
      <div className="flex flex-col h-[100dvh] bg-black p-4">
        <div className="flex items-center gap-4 shrink-0 mb-6 mt-2">
          <button
            onClick={() => setShowSplit(false)}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:bg-white/20 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold tracking-tight uppercase text-white">Schedule</h1>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar mask-fade-edges pb-8">
          <WeeklySplit currentDate={date} data={workout.data} />
        </div>
      </div>
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
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-black relative">
      <div className="flex-1 flex flex-col justify-center items-center px-4 w-full">
        {/* Date / Top Info */}
        <p className="text-[12px] font-mono text-white/50 uppercase tracking-widest mb-2">
          {formatDisplayDate(date)}
        </p>

        {/* Day Type (Massive checkmark if done) */}
        {isDone ? (
          <div className="flex flex-col items-center">
            <CheckCircle className="w-24 h-24 text-green-500 mb-4" />
            <h1 className="text-4xl font-black tracking-tighter uppercase text-white leading-none">
              DONE
            </h1>
          </div>
        ) : (
          <h1 className="text-[64px] font-black tracking-tighter uppercase text-white leading-none mb-4">
            {workoutType === 'push' ? 'PUSH' : workoutType === 'pull' ? 'PULL' : 'LEGS'}
          </h1>
        )}
        
        {/* Streak indicator if applicable */}
        {!isDone && streak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 mt-2">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-xs font-bold text-orange-500">{streak}</span>
          </div>
        )}
      </div>

      {/* Primary Action Button (Edge-to-edge Pill) */}
      {!isDone && (
        <div className="w-full absolute bottom-8 px-4 z-10">
          <Button
            size="lg"
            onClick={workout.startWorkout}
            className="w-full h-[68px] rounded-full bg-white text-black hover:bg-white/90 active:scale-95 transition-all text-2xl font-black uppercase tracking-tight shadow-lg"
          >
            Start
          </Button>
        </div>
      )}

      {/* Secondary Actions (Top Corners for Watch) */}
      {!isDone && (
        <>
          <div className="absolute top-6 left-4 z-20">
            <button
              onClick={() => setShowSplit(true)}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:bg-white/20 transition-colors"
              aria-label="Weekly Split"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute top-6 right-4 z-20">
            <button
              onClick={() => setShowHistory(true)}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white active:bg-white/20 transition-colors"
              aria-label="History"
            >
              <ChartBar className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {isDone && (
        <div className="w-full absolute bottom-8 px-4 flex justify-center gap-6">
          <button
            onClick={() => setShowSplit(true)}
            className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white active:bg-white/20 transition-colors flex-col gap-1"
          >
            <CalendarDays className="w-6 h-6" />
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white active:bg-white/20 transition-colors flex-col gap-1"
          >
            <ChartBar className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
