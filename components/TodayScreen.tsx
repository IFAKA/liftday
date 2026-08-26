'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Dumbbell } from 'lucide-react';
import { useWorkout } from '@/hooks/useWorkout';
import { useSchedule } from '@/hooks/useSchedule';
import { useMobility } from '@/hooks/useMobility';
import { formatWorkoutType, getWorkoutType } from '@/lib/schedule';
import { clearStorageIssues, getStorageIssues } from '@/lib/browser-storage';
import { REST_DURATION } from '@/lib/constants';
import { installNativeWorkoutBridge, publishWorkoutSnapshot } from '@/lib/native-bridge';
import { getRoutine } from '@/lib/routines';
import { clearLiftDayStorage, loadUserProfile } from '@/lib/storage';
import { TodayHub } from './today/TodayHub';
import { CooldownStretchScreen } from './CooldownStretchScreen';
const ONBOARDING_KEY = 'liftday_onboarding_completed';
const ScreenFallback = () => <LoadingScreen />;

const ExerciseScreen = dynamic(
  () => import('@/components/ExerciseScreen').then((mod) => mod.ExerciseScreen),
  { loading: ScreenFallback, ssr: false }
);
const RestTimer = dynamic(
  () => import('@/components/RestTimer').then((mod) => mod.RestTimer),
  { loading: ScreenFallback, ssr: false }
);
const SessionComplete = dynamic(
  () => import('@/components/SessionComplete').then((mod) => mod.SessionComplete),
  { loading: ScreenFallback, ssr: false }
);
const PrepTimer = dynamic(
  () => import('@/components/PrepTimer').then((mod) => mod.PrepTimer),
  { loading: ScreenFallback, ssr: false }
);
const RestDayScreen = dynamic(
  () => import('@/components/RestDayScreen').then((mod) => mod.RestDayScreen),
  { loading: ScreenFallback, ssr: false }
);

export function TodayScreen() {
  const [today] = useState(() => new Date());
  const router = useRouter();

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem(ONBOARDING_KEY);
    if (!hasSeenOnboarding) {
      router.replace('/onboarding');
    }
  }, [router]);

  return <TodayContent date={today} />;
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-[100dvh] bg-black">
      <Dumbbell className="w-8 h-8 text-white/50 animate-pulse" />
    </div>
  );
}

function TodayContent({ date }: { date: Date }) {
  const [storageIssue] = useState<string | null>(() => {
    const latestIssue = getStorageIssues().at(-1);
    return latestIssue?.reason ?? null;
  });
  const workout = useWorkout(date);
  const { isStorageHydrated, state: workoutState, startWorkout } = workout;
  const schedule = useSchedule(date, workout.data);
  const mobility = useMobility();

  useEffect(() => {
    if (isStorageHydrated && workoutState === 'idle' && schedule.isTraining && !schedule.isDone) {
      void startWorkout();
    }
  }, [isStorageHydrated, schedule.isDone, schedule.isTraining, startWorkout, workoutState]);

  useEffect(() => {
    const cleanup = installNativeWorkoutBridge(workout.surfaceSnapshot, {
      startPlank: workout.startWarmupTimer,
      busy: workout.handleMachineOccupied,
      log: (reps, weight) => workout.logSet(reps, weight),
      skipRest: workout.skipTimer,
      repeatCooldown: workout.repeatCooldown,
      end: workout.finishWorkout,
    });
    publishWorkoutSnapshot(workout.surfaceSnapshot);
    return cleanup;
  // The callbacks are stable hook-owned commands; the snapshot is the only changing bridge payload.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout.surfaceSnapshot]);

  const profile = loadUserProfile();
  const storageReady = workout.isStorageHydrated;
  const storageIssueMessage = storageIssue ?? formatStorageIssue(getStorageIssues().at(-1));

  if (storageIssueMessage) {
    return <StorageErrorScreen message={storageIssueMessage} />;
  }

  if (workout.routineError || schedule.routineError) {
    return <StorageErrorScreen message={workout.routineError ?? schedule.routineError ?? 'Routine setup is invalid.'} />;
  }

  if (workout.setupRequired || !profile?.activeRoutine) {
    return <TodayHub isDone={false} workoutTitle="SETUP REQUIRED" storageReady={false} storageIssueMessage="Choose a routine to continue." startError={null} />;
  }
  const routine = getRoutine(profile.activeRoutine);
  const workoutType = getWorkoutType(date, routine.schedule, routine.trainingWeekdays);

  if (workout.isRestoringActiveWorkout) {
    return <LoadingScreen />;
  }

  // Rest day
  if (!schedule.isTraining) {
    return (
      <RestDayScreen
        date={date}
        nextTraining={schedule.nextTraining}
        mobility={mobility}
      />
    );
  }

  // Workout in progress
  if (workout.phase === 'warmup-stretch' || workout.phase === 'warmup-plank') {
    return (
      <PrepTimer
        mode={workout.phase === 'warmup-stretch' ? 'warmup-stretch' : 'warmup-plank'}
        seconds={workout.timer}
        totalSeconds={workout.phase === 'warmup-stretch' ? 1 : workout.warmupDuration}
        isRunning={!workout.timerPaused}
        onCancel={workout.quitWorkout}
        onPrimary={workout.phase === 'warmup-stretch' ? workout.startWarmupTimer : workout.beginWorkoutAfterWarmup}
        onStartTimer={workout.startWarmupTimer}
      />
    );
  }

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
        currentWeightStep={workout.currentWeightStep}
        prescription={workout.currentPrescription}
        previousRep={workout.previousRep}
        previousWeight={workout.previousWeight}
        coachingReference={workout.coachingReference}
        autoAdjustSuggestion={workout.autoAdjustSuggestion}
        topRecommendation={workout.topRecommendation}
        supersetPartnerName={workout.currentSupersetPartnerName}
        equipmentBlockPartnerName={workout.currentEquipmentBlockPartnerName}
        currentExerciseSets={workout.sessionReps[workout.currentExercise!.key] ?? []}
        flashColor={workout.flashColor}
        persistenceError={workout.persistenceError}
        onLogSet={workout.logSet}
        onRetryComplete={workout.retryWorkoutSave}
        onQuit={workout.quitWorkout}
        onMachineOccupied={workout.handleMachineOccupied}
        swapAlternatives={workout.swapAlternatives}
        onSelectAlternative={workout.selectAlternativeForOccupied}
        canDeferMachineOccupied={workout.canDeferMachineOccupied}
      />
    );
  }

  if (workout.state === 'resting') {
    return (
      <RestTimer
        seconds={workout.timer}
        totalSeconds={workout.currentPrescription?.restSeconds ?? REST_DURATION}
        isPaused={workout.timerPaused}
        onSkip={workout.skipTimer}
        onQuit={workout.quitWorkout}
        nextExerciseName={workout.nextExerciseAfterRestName}
        nextSupersetPartnerName={workout.nextSupersetPartnerName}
        nextEquipmentBlockPartnerName={workout.nextEquipmentBlockPartnerName}
        onNextMachineOccupied={
          workout.canHandleNextExerciseMachineOccupied ? workout.handleNextExerciseMachineOccupied : undefined
        }
      />
    );
  }

  if (workout.phase === 'cooldown-stretch' || workout.phase === 'cooldown-choice') {
    return (
      <CooldownStretchScreen
        phase={workout.phase}
        seconds={workout.timer}
        onRepeat={workout.repeatCooldown}
        onEnd={workout.finishWorkout}
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
  const isDone = storageReady && schedule.isDone;
  return (
    <TodayHub
      isDone={isDone}
      workoutTitle={formatWorkoutType(workoutType)}
      storageReady={storageReady}
      storageIssueMessage={storageIssueMessage}
      startError={null}
    />
  );
}

function formatStorageIssue(issue: ReturnType<typeof getStorageIssues>[number] | undefined): string | null {
  if (!issue) return null;
  return issue.reason;
}

function StorageErrorScreen({ message }: { message: string }) {
  const reset = () => {
    const result = clearLiftDayStorage();
    if (!result.success) return;
    clearStorageIssues();
    window.location.href = '/onboarding';
  };

  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
      <h1 className="text-fluid-title font-black uppercase">Storage setup required</h1>
      <p className="max-w-xs text-fluid-label text-white/55">{message}</p>
      <button type="button" onClick={reset} className="h-12 rounded-xl bg-white px-5 text-fluid-label font-black uppercase text-black">Reset local data</button>
    </div>
  );
}
