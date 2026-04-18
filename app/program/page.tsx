'use client';

import { useState, useEffect } from 'react';
import { RoutineScreen } from '@/components/RoutineScreen';
import { WeeklySplit } from '@/components/WeeklySplit';
import { loadUserProfile, loadWorkoutData } from '@/lib/storage';
import { getWorkoutType } from '@/lib/schedule';
import { getChainsForWorkout, resolveExerciseKey } from '@/lib/tiers';
import { EXERCISES } from '@/lib/constants';
import { getRoutine } from '@/lib/routines';
import { Exercise, WorkoutData } from '@/lib/types';
import { TopBar } from '@/components/TopBar';
import { cn } from '@/lib/utils';
import { scoreRoutine } from '@/lib/routine-score';
import { RoutineScoreResult } from '@/lib/smv';

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
  const [smvScore, setSmvScore] = useState<RoutineScoreResult | null>(null);

  useEffect(() => {
    setData(loadWorkoutData());
    const today = new Date();
    const profile = loadUserProfile();
    const routine = getRoutine(profile?.activeRoutine ?? 'calisthenics');
    const wt = getWorkoutType(today, routine.schedule);
    setWorkoutType(wt);
    if (wt === 'rest') return;

    const tiers = profile?.tiers ?? {};
    const chains = getChainsForWorkout(wt, routine.id);
    const exs = chains
      .map((chain) => {
        const key = resolveExerciseKey(chain, tiers);
        return EXERCISES.find((e) => e.key === key)!;
      })
      .filter(Boolean);
    setExercises(exs);
    setSmvScore(scoreRoutine(routine));
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
          <div className="flex flex-col overflow-y-auto no-scrollbar pb-8">
            <WeeklySplit currentDate={new Date()} data={data} />
            {smvScore && <SmvScoreCard score={smvScore} />}
          </div>
        )}
      </div>
    </div>
  );
}

function SmvScoreCard({ score }: { score: RoutineScoreResult }) {
  const muscles = Object.entries(score.breakdown)
    .filter(([, v]) => v.sets > 0 || v.penalty > 0)
    .sort(([, a], [, b]) => b.net - a.net);

  return (
    <div className="px-4 pt-2">
      <div className="rounded-2xl bg-white/5 border border-white/5 p-5">
        <div className="flex items-baseline justify-between mb-4">
          <span className="text-fluid-label font-black uppercase tracking-widest text-white/40 font-mono">SMV Score</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white tabular-nums">{score.total}</span>
            {score.penalty > 0 && (
              <span className="text-fluid-label font-mono text-red-400">−{score.penalty} penalty</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {muscles.map(([muscle, v]) => {
            const max = score.gross > 0 ? score.gross : 1;
            const barWidth = Math.max(4, Math.round((v.gross / max) * 100));
            const hasPenalty = v.penalty > 0;
            return (
              <div key={muscle} className="flex items-center gap-3">
                <span className="text-fluid-label font-mono text-white/30 w-20 shrink-0 uppercase tracking-wide truncate">
                  {muscle.replace('_', ' ')}
                </span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', hasPenalty ? 'bg-red-400' : 'bg-white/40')}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className={cn('text-fluid-label font-mono tabular-nums w-8 text-right shrink-0', hasPenalty ? 'text-red-400' : 'text-white/40')}>
                  {v.net}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
