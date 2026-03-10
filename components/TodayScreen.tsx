'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dumbbell, CheckCircle, Flame, ChartBar, CalendarDays } from 'lucide-react';
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
import { formatDisplayDate } from '@/lib/workout-utils';
import { saveUserProfile, getDefaultProfile } from '@/lib/storage';
import { getWorkoutType, getTrainingStreak } from '@/lib/schedule';
import { motion } from 'framer-motion';

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

import { TopBar } from './TopBar';

function TodayContent({ date }: { date: Date }) {
  const workout = useWorkout(date);
  const schedule = useSchedule(date, workout.data);
  const mobility = useMobility();
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
      <WeeklySplit 
        currentDate={date} 
        data={workout.data} 
        onBack={() => setShowSplit(false)} 
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
    <motion.div 
      className="flex flex-col h-full overflow-hidden bg-black relative"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.1}
      onDragEnd={(e, { offset, velocity }) => {
        // Swipe Left (reveals history on the right)
        if (offset.x < -40 || velocity.x < -400) {
          setShowHistory(true);
        }
        // Swipe Right (reveals weekly split on the left)
        if (offset.x > 40 || velocity.x > 400) {
          setShowSplit(true);
        }
      }}
    >
      <TopBar
        leftAction={
          <button
            onClick={() => setShowSplit(true)}
            className="p-2 -ml-2 text-white/50 active:text-white transition-colors"
          >
            <CalendarDays className="w-5 h-5" />
          </button>
        }
        center={
          <span className="text-fluid-label font-mono font-black text-white/70 uppercase tracking-widest">
            {formatDisplayDate(date)}
          </span>
        }
        rightAction={
          <button
            onClick={() => setShowHistory(true)}
            className="p-2 -mr-2 text-white/60 active:text-white transition-colors scale-110"
          >
            <ChartBar className="w-6 h-6" />
          </button>
        }
      />

      <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-8">
        {isDone ? (
          <div className="flex flex-col items-center">
            <CheckCircle className="w-20 h-20 text-green-500 mb-6" />
            <h1 className="text-fluid-title font-black tracking-tighter uppercase text-white leading-none">
              DONE
            </h1>
          </div>
        ) : (
          <>
            <h1 className="text-fluid-title font-black tracking-tighter uppercase text-white leading-none text-center">
              {workoutType === 'push' ? 'PUSH' : workoutType === 'pull' ? 'PULL' : 'LEGS'}
            </h1>
            {streak > 0 && (
              <div className="flex items-center gap-2 mt-4 bg-orange-500/10 px-4 py-1.5 rounded-full border border-orange-500/20">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="text-fluid-label font-black text-orange-500 uppercase tracking-widest">{streak} DAY STREAK</span>
              </div>
            )}
          </>
        )}
      </div>

      {!isDone && (
        <div className="w-full px-4 pb-safe mb-4 shrink-0">
          <Button
            onClick={workout.startWorkout}
            className="w-full btn-fluid rounded-full bg-white text-black active:scale-95 transition-all font-black uppercase tracking-tight shadow-xl"
          >
            Start
          </Button>
        </div>
      )}
    </motion.div>
  );
}
