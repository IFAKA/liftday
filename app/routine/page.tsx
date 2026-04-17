'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RoutineScreen } from '@/components/RoutineScreen';
import { loadUserProfile } from '@/lib/storage';
import { getWorkoutType } from '@/lib/schedule';
import { getChainsForWorkout, resolveExerciseKey } from '@/lib/tiers';
import { EXERCISES } from '@/lib/constants';
import { Exercise } from '@/lib/types';

const TYPE_COLOR: Record<string, string> = {
  push: 'text-orange-400',
  pull: 'text-blue-400',
  legs: 'text-green-400',
};

export default function RoutinePage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutType, setWorkoutType] = useState('');

  useEffect(() => {
    const today = new Date();
    const wt = getWorkoutType(today);
    setWorkoutType(wt);
    if (wt === 'rest') return;

    const profile = loadUserProfile();
    const tiers = profile?.tiers ?? {};
    const chains = getChainsForWorkout(wt);
    const exs = chains
      .map((chain) => {
        const key = resolveExerciseKey(chain, tiers);
        return EXERCISES.find((e) => e.key === key)!;
      })
      .filter(Boolean);
    setExercises(exs);
  }, []);

  if (!workoutType || workoutType === 'rest') return null;

  const label = workoutType === 'push' ? 'Push' : workoutType === 'pull' ? 'Pull' : 'Legs';

  return (
    <RoutineScreen
      exercises={exercises}
      title={label}
      titleColor={TYPE_COLOR[workoutType]}
      subtitle={`${exercises.length} EXERCISES`}
      onBack={() => router.push('/')}
    />
  );
}
