'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSchedule } from '@/hooks/useSchedule';
import { useAppState } from '@/components/AppStateProvider';
import { WorkoutFlow } from '@/components/WorkoutFlow';

export default function WorkoutPage() {
  const router = useRouter();
  const { workout } = useAppState();
  const { isStorageHydrated, setupRequired, startWorkout, state } = workout;
  const date = useMemo(() => new Date(), []);
  const schedule = useSchedule(date, workout.data);
  const previousState = useRef(state);

  useEffect(() => {
    if (!isStorageHydrated) return;
    if (!window.localStorage.getItem('liftday_onboarding_completed')) {
      router.replace('/onboarding');
      return;
    }
    if (previousState.current !== 'idle' && state === 'idle') {
      router.replace('/');
      return;
    }
    previousState.current = state;
    if (!schedule.isTraining || schedule.isDone || setupRequired) {
      router.replace('/');
      return;
    }
    if (state === 'idle') {
      void startWorkout();
      return;
    }
    if (state === 'complete' || state === 'exercising' || state === 'resting') return;
  }, [isStorageHydrated, router, schedule.isDone, schedule.isTraining, setupRequired, startWorkout, state]);

  if (!isStorageHydrated || state === 'idle') {
    return <div className="flex h-full items-center justify-center bg-black text-fluid-label font-black uppercase tracking-widest text-white/40">Loading workout…</div>;
  }

  return <WorkoutFlow workout={workout} date={date} />;
}
