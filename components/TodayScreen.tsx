'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Dumbbell } from 'lucide-react';
import { useWorkout } from '@/hooks/useWorkout';
import { useSchedule } from '@/hooks/useSchedule';
import { useMobility } from '@/hooks/useMobility';
import { formatWorkoutType, getWorkoutType } from '@/lib/schedule';
import { DailyLog } from '@/lib/types';
import { loadDailyLogs } from '@/lib/storage';
import { getStorageIssues } from '@/lib/browser-storage';
import { REST_DURATION } from '@/lib/constants';
import { getMeasurementCheckDue } from '@/lib/measurement-schedule';
import { loadProgressPhotos } from '@/lib/progress-photos';
import { TodayHub } from './today/TodayHub';
import { ProgressPhotoCheckScreen, WeeklyMeasurementScreen, WeightCheckScreen } from './today/PreWorkoutGates';

type PreWorkoutGate = 'measurements' | 'weight' | 'photo' | null;
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
const ExerciseTransition = dynamic(
  () => import('@/components/ExerciseTransition').then((mod) => mod.ExerciseTransition),
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
  const [startError, setStartError] = useState<string | null>(null);
  const [dailyLogs, setDailyLogs] = useState<Record<string, DailyLog>>({});
  const [photoDateKeys, setPhotoDateKeys] = useState<string[]>([]);
  const [storageIssue, setStorageIssue] = useState<string | null>(null);
  const [preWorkoutGate, setPreWorkoutGate] = useState<PreWorkoutGate>(null);
  const workout = useWorkout(date);
  const schedule = useSchedule(date, workout.data);
  const mobility = useMobility();
  const workoutType = getWorkoutType(date);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDailyLogs(loadDailyLogs());
    setPhotoDateKeys(loadProgressPhotos().map((photo) => photo.dateKey));
    const latestIssue = getStorageIssues().at(-1);
    if (latestIssue) {
      setStorageIssue(`${latestIssue.reason} Recovery: ${latestIssue.recoveryKey ?? 'not available'}.`);
    }
  }, []);

  if (workout.isRestoringActiveWorkout) {
    return <LoadingScreen />;
  }

  const storageReady = workout.isStorageHydrated;
  const storageIssueMessage = storageIssue ?? formatStorageIssue(getStorageIssues().at(-1));

  // Rest day
  if (!schedule.isTraining) {
    return (
      <RestDayScreen
        date={date}
        nextTraining={schedule.nextTraining}
        weekCompleted={schedule.weekProgress.completed}
        weekTotal={schedule.weekProgress.total}
        mobility={mobility}
      />
    );
  }

  // Workout in progress
  if (workout.state === 'warming-up') {
    return (
      <PrepTimer
        mode="warmup"
        seconds={workout.timer}
        totalSeconds={workout.warmupDuration}
        isRunning={!workout.timerPaused}
        onCancel={workout.quitWorkout}
        onPrimary={workout.beginWorkoutAfterWarmup}
        onStartTimer={workout.startWarmupTimer}
        onPreset={workout.setWarmupDuration}
        onRepeat={workout.repeatWarmupTimer}
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
        totalSeconds={workout.currentPrescription?.restSeconds ?? REST_DURATION}
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
  const isDone = storageReady && schedule.isDone;
  const dueCheck = getMeasurementCheckDue(date, dailyLogs, photoDateKeys);

  const startWarmup = () => {
    setStartError(null);
    setPreWorkoutGate(null);

    workout.startWorkout().catch((error: unknown) => {
      setStartError(error instanceof Error ? error.message : 'Workout start failed.');
    });
  };

  const continueAfterMeasurements = (nextLogs: Record<string, DailyLog>) => {
    setDailyLogs(nextLogs);
    const nextDue = getMeasurementCheckDue(date, nextLogs, photoDateKeys);
    if (nextDue.weightDue) {
      setPreWorkoutGate('weight');
      return;
    }

    if (nextDue.photoDue) {
      setPreWorkoutGate('photo');
      return;
    }

    startWarmup();
  };

  const continueAfterWeight = (nextLogs: Record<string, DailyLog>) => {
    setDailyLogs(nextLogs);
    const nextDue = getMeasurementCheckDue(date, nextLogs, photoDateKeys);
    if (nextDue.photoDue) {
      setPreWorkoutGate('photo');
      return;
    }
    startWarmup();
  };

  const continueAfterPhoto = (nextLogs: Record<string, DailyLog>) => {
    setDailyLogs(nextLogs);
    setPhotoDateKeys(loadProgressPhotos().map((photo) => photo.dateKey));
    startWarmup();
  };

  const handleStart = () => {
    setStartError(null);
    if (dueCheck.measurementFields.length > 0) {
      setPreWorkoutGate('measurements');
      return;
    }

    if (dueCheck.weightDue) {
      setPreWorkoutGate('weight');
      return;
    }

    if (dueCheck.photoDue) {
      setPreWorkoutGate('photo');
      return;
    }

    startWarmup();
  };

  if (!isDone && preWorkoutGate === 'measurements') {
    return (
      <WeeklyMeasurementScreen
        date={date}
        dueDateKeys={dueCheck.dueDateKeys}
        fields={dueCheck.measurementFields}
        logs={dailyLogs}
        onCancel={() => setPreWorkoutGate(null)}
        onComplete={continueAfterMeasurements}
      />
    );
  }

  if (!isDone && preWorkoutGate === 'weight') {
    return (
      <WeightCheckScreen
        date={date}
        dueDateKeys={dueCheck.dueDateKeys}
        logs={dailyLogs}
        onCancel={() => setPreWorkoutGate(null)}
        onComplete={continueAfterWeight}
      />
    );
  }

  if (!isDone && preWorkoutGate === 'photo') {
    return (
      <ProgressPhotoCheckScreen
        date={date}
        dueDateKeys={dueCheck.dueDateKeys}
        logs={dailyLogs}
        onCancel={() => setPreWorkoutGate(null)}
        onComplete={continueAfterPhoto}
      />
    );
  }

  return (
    <TodayHub
      isDone={isDone}
      workoutTitle={formatWorkoutType(workoutType)}
      storageReady={storageReady}
      storageIssueMessage={storageIssueMessage}
      startError={startError}
      onStart={handleStart}
    />
  );
}

function formatStorageIssue(issue: ReturnType<typeof getStorageIssues>[number] | undefined): string | null {
  if (!issue) return null;
  return `${issue.reason} Recovery: ${issue.recoveryKey ?? 'not available'}.`;
}
