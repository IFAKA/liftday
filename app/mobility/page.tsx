'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSchedule } from '@/hooks/useSchedule';
import { useAppState } from '@/components/AppStateProvider';
import { RestDayScreen } from '@/components/RestDayScreen';

export default function MobilityPage() {
  const router = useRouter();
  const { workout, mobility } = useAppState();
  const { isActive, isComplete, startMobility } = mobility;
  const date = useMemo(() => new Date(), []);
  const schedule = useSchedule(date, workout.data);

  useEffect(() => {
    if (!window.localStorage.getItem('liftday_onboarding_completed')) {
      router.replace('/onboarding');
      return;
    }
    if (schedule.isTraining || isComplete) {
      router.replace('/');
      return;
    }
    if (!isActive) startMobility();
  }, [isActive, isComplete, router, schedule.isTraining, startMobility]);

  if (!isActive) {
    return <div className="flex h-full items-center justify-center bg-black text-fluid-label font-black uppercase tracking-widest text-white/40">Loading mobility…</div>;
  }

  return <RestDayScreen date={date} nextTraining={schedule.nextTraining} mobility={mobility} />;
}
