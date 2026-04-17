'use client';

import { useState, useEffect } from 'react';
import { RoutineScreen } from '@/components/RoutineScreen';
import { WeeklySplit } from '@/components/WeeklySplit';
import { loadUserProfile, loadWorkoutData } from '@/lib/storage';
import { getWorkoutType } from '@/lib/schedule';
import { getChainsForWorkout, resolveExerciseKey } from '@/lib/tiers';
import { EXERCISES } from '@/lib/constants';
import { Exercise, WorkoutData } from '@/lib/types';
import { TopBar } from '@/components/TopBar';
import { cn } from '@/lib/utils';

const TYPE_COLOR: Record<string, string> = {
  push: 'text-orange-400',
  pull: 'text-blue-400',
  legs: 'text-green-400',
};

type Tab = 'today' | 'week';

export default function ProgramPage() {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutType, setWorkoutType] = useState('');
  const [data, setData] = useState<WorkoutData>({});

  useEffect(() => {
    setData(loadWorkoutData());
    const today = new Date();
    const wt = getWorkoutType(today);
    setWorkoutType(wt);
    if (wt === 'rest') return;

    const profile = loadUserProfile();
    const tiers = profile?.tiers ?? {};
    const activeRoutine = profile?.activeRoutine ?? 'calisthenics';
    const chains = getChainsForWorkout(wt, activeRoutine);
    const exs = chains
      .map((chain) => {
        const key = resolveExerciseKey(chain, tiers);
        return EXERCISES.find((e) => e.key === key)!;
      })
      .filter(Boolean);
    setExercises(exs);
  }, []);

  const label = workoutType === 'push' ? 'Push' : workoutType === 'pull' ? 'Pull' : workoutType === 'legs' ? 'Legs' : 'Rest';

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      <TopBar
        center={
          <div className="flex gap-1 bg-white/10 rounded-full p-1">
            {(['today', 'week'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest font-mono transition-colors',
                  activeTab === tab ? 'bg-white text-black' : 'text-white/40'
                )}
              >
                {tab === 'today' ? 'Today' : 'Week'}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex-1 min-h-0">
        {activeTab === 'today' ? (
          workoutType === 'rest' || !workoutType ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-white/30 font-black uppercase tracking-widest text-fluid-label">Rest Day</span>
            </div>
          ) : (
            <RoutineScreen
              exercises={exercises}
              title={label}
              titleColor={TYPE_COLOR[workoutType]}
              subtitle={`${exercises.length} EXERCISES`}
              hideTopBar
            />
          )
        ) : (
          <WeeklySplit currentDate={new Date()} data={data} />
        )}
      </div>
    </div>
  );
}
