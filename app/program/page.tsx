'use client';

import { useState } from 'react';
import { RoutineScreen } from '@/components/RoutineScreen';
import { WeeklySplit } from '@/components/WeeklySplit';
import { getFirstSessionDate, loadUserProfile, loadWorkoutData } from '@/lib/storage';
import { getWorkoutType } from '@/lib/schedule';
import { getSetsForWeek, getWeekNumber } from '@/lib/workout-utils';
import { getChainsForWorkout, resolveExerciseKey } from '@/lib/tiers';
import { EXERCISES } from '@/lib/constants';
import { getRoutine } from '@/lib/routines';
import { Exercise, ExerciseKey, SetEntry, setEntryReps, setEntryWeight, WorkoutData } from '@/lib/types';
import { TopBar } from '@/components/TopBar';
import { cn } from '@/lib/utils';
import { scoreRoutine } from '@/lib/routine-score';
import { RoutineScoreResult } from '@/lib/smv';

const TYPE_COLOR: Record<string, string> = {
  push: 'text-orange-400',
  pull: 'text-blue-400',
  legs: 'text-green-400',
};

type Tab = 'today' | 'smv';

interface ProgressSignal {
  label: string;
  summary: string;
  nextAction: string;
  tone: string;
}

export default function ProgramPage() {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [{ exercises, workoutType, data, smvScore, progressSignal }] = useState<{
    exercises: Exercise[];
    workoutType: string;
    data: WorkoutData;
    smvScore: RoutineScoreResult | null;
    progressSignal: ProgressSignal | null;
  }>(() => {
    if (typeof window === 'undefined') return { exercises: [], workoutType: '', data: {}, smvScore: null, progressSignal: null };
    const today = new Date();
    const profile = loadUserProfile();
    const routine = getRoutine(profile?.activeRoutine ?? 'calisthenics');
    const wt = getWorkoutType(today, routine.schedule);
    const data = loadWorkoutData();
    if (wt === 'rest') return { exercises: [], workoutType: wt, data, smvScore: null, progressSignal: null };
    const weekNumber = getWeekNumber(getFirstSessionDate(), today);
    const setsPerExercise = getSetsForWeek(weekNumber, profile?.setsPerExercise);
    const tiers = profile?.tiers ?? {};
    const chains = getChainsForWorkout(wt, routine.id);
    const exs = chains
      .map((chain) => {
        const key = resolveExerciseKey(chain, tiers);
        return EXERCISES.find((e) => e.key === key)!;
      })
      .filter(Boolean);
    const weeklyExercises = routine.tierChains
      .map((chain) => {
        const key = resolveExerciseKey(chain, tiers);
        return EXERCISES.find((e) => e.key === key)!;
      })
      .filter(Boolean);
    return {
      exercises: exs,
      workoutType: wt,
      data,
      smvScore: scoreRoutine(routine, { tiers, setsPerExercise }),
      progressSignal: getProgressSignal(data, weeklyExercises),
    };
  });

  const label = workoutType === 'push' ? 'Push' : workoutType === 'pull' ? 'Pull' : workoutType === 'legs' ? 'Legs' : 'Rest';

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden">
      <TopBar
        center={
          <div className="flex gap-1 bg-white/10 rounded-full p-1">
            {(['today', 'smv'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest font-mono transition-colors',
                  activeTab === tab ? 'bg-white text-black' : 'text-white/40'
                )}
              >
                {tab === 'today' ? 'Today' : 'SMV'}
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
            {smvScore && <SmvScoreCard score={smvScore} progressSignal={progressSignal} />}
            <WeeklySplit currentDate={new Date()} data={data} />
          </div>
        )}
      </div>
    </div>
  );
}

function SmvScoreCard({ score, progressSignal }: { score: RoutineScoreResult; progressSignal: ProgressSignal | null }) {
  const verdict = getSmvVerdict(score);
  const muscles = Object.entries(score.breakdown)
    .filter(([, v]) => v.sets > 0 || v.penalty > 0)
    .sort(([, a], [, b]) => b.net - a.net);

  return (
    <div className="px-4 pt-2">
      <div className="rounded-2xl bg-white/5 border border-white/5 p-5 select-text">
        <div className="flex items-baseline justify-between mb-4">
          <span className="text-fluid-label font-black uppercase tracking-widest text-white/40 font-mono">SMV Score</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white tabular-nums">{formatOneDecimal(score.total)}</span>
            <span className="text-fluid-label font-mono text-white/30">{formatOneDecimal(score.efficiency)}/set</span>
            {score.penalty > 0 && (
              <span className="text-fluid-label font-mono text-red-400">-{formatOneDecimal(score.penalty)} penalty</span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 mb-4">
          <div className="flex flex-col gap-1">
            <span className={cn('text-fluid-label font-mono uppercase tracking-widest', verdict.tone)}>
              {verdict.label}
            </span>
            <span className="text-fluid-ui font-black uppercase tracking-tight text-white">
              {verdict.summary}
            </span>
            <span className="text-fluid-label font-mono uppercase tracking-wide text-white/35">
              {verdict.nextAction}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <SmvMetric label="sets" value={formatOneDecimal(score.cost.totalSets)} />
          <SmvMetric label="moves" value={formatOneDecimal(score.cost.equipmentChanges)} />
          <SmvMetric label="cost" value={formatOneDecimal(score.cost.total)} />
        </div>

        {progressSignal && (
          <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 mb-4">
            <div className="flex flex-col gap-1">
              <span className={cn('text-fluid-label font-mono uppercase tracking-widest', progressSignal.tone)}>
                {progressSignal.label}
              </span>
              <span className="text-fluid-label font-mono uppercase tracking-wide text-white/65">
                {progressSignal.summary}
              </span>
              <span className="text-fluid-label font-mono uppercase tracking-wide text-white/30">
                {progressSignal.nextAction}
              </span>
            </div>
          </div>
        )}

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
                  {formatOneDecimal(v.net)}
                </span>
                <span className="text-fluid-label font-mono tabular-nums w-12 text-right shrink-0 text-white/25">
                  {formatSetCount(v.sets)}/{v.target}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getSmvVerdict(score: RoutineScoreResult): { label: string; summary: string; nextAction: string; tone: string } {
  const lats = score.breakdown.lats;
  const sideDelt = score.breakdown.side_delt;
  const vTaperDeficit = (lats && lats.sets < lats.target) || (sideDelt && sideDelt.sets < sideDelt.target);
  const highVolume = score.cost.longSessionSets > 0 || score.cost.totalSets > 126;
  const highFriction = score.cost.equipmentChanges > 24;

  if (vTaperDeficit) {
    return {
      label: 'Needs tuning',
      summary: 'V-taper muscles are under target.',
      nextAction: 'Prioritize lats and side delts before adding chest or legs.',
      tone: 'text-yellow-400',
    };
  }

  if (highVolume || highFriction) {
    return {
      label: 'Good but costly',
      summary: highVolume ? 'The routine has high weekly volume.' : 'The routine has too many station changes.',
      nextAction: 'Keep the score, but trim low-priority sets if workouts feel long.',
      tone: 'text-yellow-400',
    };
  }

  return {
    label: 'Efficient',
    summary: 'Priority muscles are covered without excess cost.',
    nextAction: 'Keep progressing the current routine.',
    tone: 'text-green-400',
  };
}

function getProgressSignal(data: WorkoutData, exercises: Exercise[]): ProgressSignal {
  const tracked = exercises
    .filter((exercise) => ['lats', 'side_delt', 'chest', 'biceps', 'triceps'].includes(exercise.primaryMuscle))
    .map((exercise) => getExerciseProgress(data, exercise.key))
    .filter((entry): entry is { latest: number; previous: number } => entry !== null);

  if (tracked.length < 3) {
    return {
      label: 'Progress data',
      summary: 'Not enough logged history yet.',
      nextAction: 'Log 3 hard sets per exercise for two full weeks.',
      tone: 'text-white/40',
    };
  }

  const improving = tracked.filter((entry) => entry.latest > entry.previous * 1.02).length;
  const regressing = tracked.filter((entry) => entry.latest < entry.previous * 0.98).length;

  if (regressing >= 3) {
    return {
      label: 'Recovery limit',
      summary: 'Several priority lifts are trending down.',
      nextAction: 'Hold volume. Improve sleep, protein, and load selection.',
      tone: 'text-red-400',
    };
  }

  if (improving >= Math.ceil(tracked.length / 2)) {
    return {
      label: 'Frontier push',
      summary: 'Priority lifts are progressing.',
      nextAction: 'Keep the routine and add load or reps when targets are hit.',
      tone: 'text-green-400',
    };
  }

  return {
    label: 'Stable',
    summary: 'Progress is flat but not crashing.',
    nextAction: 'Keep volume fixed. Chase cleaner reps before adding exercises.',
    tone: 'text-yellow-400',
  };
}

function getExerciseProgress(data: WorkoutData, key: ExerciseKey): { latest: number; previous: number } | null {
  const scored = Object.keys(data)
    .filter((date) => data[date]?.[key]?.length)
    .sort()
    .map((date) => {
      const sets = data[date]?.[key] ?? [];
      return scoreSessionSets(sets);
    })
    .filter((score) => score > 0);

  if (scored.length < 2) return null;
  return {
    previous: scored[scored.length - 2],
    latest: scored[scored.length - 1],
  };
}

function scoreSessionSets(sets: SetEntry[]): number {
  if (sets.length === 0) return 0;
  const scores = sets.map((entry) => {
    const reps = setEntryReps(entry);
    const weight = setEntryWeight(entry);
    return weight === null ? reps : reps * Math.max(1, weight);
  });
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function formatOneDecimal(value: number): string {
  return value.toFixed(1);
}

function formatSetCount(value: number): string {
  const roundedUp = Math.ceil(value * 10) / 10;
  return roundedUp.toFixed(1);
}

function SmvMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/30 border border-white/5 px-3 py-2">
      <div className="text-fluid-label font-mono uppercase tracking-widest text-white/25">{label}</div>
      <div className="text-fluid-ui font-black tabular-nums text-white/70">{value}</div>
    </div>
  );
}
