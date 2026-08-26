'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell } from 'lucide-react';
import { useSchedule } from '@/hooks/useSchedule';
import { formatWorkoutType, getWorkoutType } from '@/lib/schedule';
import { clearStorageIssues, getStorageIssues } from '@/lib/browser-storage';
import { getRoutine } from '@/lib/routines';
import { clearLiftDayStorage, loadUserProfile } from '@/lib/storage';
import { useAppState } from './AppStateProvider';
import { TodayHub } from './today/TodayHub';
import { RestDayScreen } from './RestDayScreen';

export function TodayScreen() {
  const [today] = useState(() => new Date());
  const router = useRouter();
  const { workout, mobility } = useAppState();
  const schedule = useSchedule(today, workout.data);

  useEffect(() => {
    const hasSeenOnboarding = window.localStorage.getItem('liftday_onboarding_completed');
    const hasActiveProfile = Boolean(loadUserProfile()?.activeRoutine);
    if (!hasSeenOnboarding || !hasActiveProfile) {
      router.replace('/onboarding');
    }
  }, [router]);

  useEffect(() => {
    if (!workout.isStorageHydrated) return;
    if (!window.localStorage.getItem('liftday_onboarding_completed') || !loadUserProfile()?.activeRoutine || workout.setupRequired) return;
    if (mobility.isActive) {
      router.replace('/mobility');
      return;
    }
    if (workout.state !== 'idle' || (schedule.isTraining && !schedule.isDone)) {
      router.replace('/workout');
    }
  }, [mobility.isActive, router, schedule.isDone, schedule.isTraining, workout.isStorageHydrated, workout.setupRequired, workout.state]);

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
  const { workout, mobility } = useAppState();
  const [storageIssue] = useState<string | null>(() => {
    const latestIssue = getStorageIssues().at(-1);
    return latestIssue?.reason ?? null;
  });
  const schedule = useSchedule(date, workout.data);

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
    return <LoadingScreen />;
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
  const router = useRouter();

  const reset = () => {
    const result = clearLiftDayStorage();
    if (!result.success) return;
    clearStorageIssues();
    router.replace('/onboarding');
  };

  return (
    <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
      <h1 className="text-fluid-title font-black uppercase">Storage setup required</h1>
      <p className="max-w-xs text-fluid-label text-white/55">{message}</p>
      <button type="button" onClick={reset} className="h-12 rounded-xl bg-white px-5 text-fluid-label font-black uppercase text-black">Reset local data</button>
    </div>
  );
}
