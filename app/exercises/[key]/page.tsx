'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { TopBar } from '@/components/TopBar';
import { WatchBackButton, WatchScreen } from '@/components/WatchSurface';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';
import { EXERCISES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { formatWorkoutType, getWorkoutTypeTone } from '@/lib/schedule';
import { getRoutineDay, getRoutineDayExercises } from '@/lib/routine-days';
import { loadProgramSummary } from '@/lib/program-summary';
import { loadWorkoutData } from '@/lib/storage';
import { getChainSetCount } from '@/lib/routine-plan';
import { getWorkbookProgressionGuidance } from '@/lib/workbook-progression';
import type { RoutineDay } from '@/lib/routine-days';
import type { RoutineConfig, UserProfile, WorkoutData } from '@/lib/types';

export default function ExerciseDetailPage() {
  return (
    <Suspense fallback={<ExerciseDetailLoading />}>
      <ExerciseDetailContent />
    </Suspense>
  );
}

function ExerciseDetailContent() {
  const { key } = useParams<{ key: string }>();
  const searchParams = useSearchParams();
  const requestedDay = searchParams.get('day');
  const { copy, isCopied } = useCopyFeedback();
  const ex = EXERCISES.find((e) => e.key === key);
  const [context, setContext] = useState<{ day: RoutineDay | null; routine: RoutineConfig | null; profile: UserProfile | null; data: WorkoutData }>({ day: null, routine: null, profile: null, data: {} });

  useEffect(() => {
    const summary = loadProgramSummary();
    const day = requestedDay ? getRoutineDay(requestedDay, summary.routine) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContext({ day, routine: summary.routine, profile: summary.profile, data: loadWorkoutData() });
  }, [requestedDay]);

  if (!ex) {
    return (
      <div className="flex items-center justify-center h-full bg-black">
        <span className="text-white/30 font-black uppercase tracking-widest text-fluid-label">Exercise not found</span>
      </div>
    );
  }

  const exerciseKey = ex.key;
  const exerciseName = ex.name;
  const copied = isCopied(exerciseKey);

  async function handleCopyName() {
    await copy(exerciseKey, exerciseName);
  }

  return (
    <WatchScreen
      top={(
        <TopBar
          leftAction={<WatchBackButton href={context.day ? `/program/${context.day.slug}` : '/program'} />}
          center={
            <div className="flex flex-col items-center">
              <span className={cn('max-w-52 truncate px-2 py-1 text-fluid-ui font-black uppercase tracking-tight leading-none', getWorkoutTypeTone(ex.workoutType))}>
                {exerciseName}
              </span>
              <span className="text-fluid-label text-white/40 font-mono tracking-widest mt-0.5 uppercase">{context.day?.label ?? formatWorkoutType(ex.workoutType)}</span>
            </div>
          }
        />
      )}
      bodyClassName="pt-2 flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleCopyName}
          className={cn(
            'flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-fluid-label font-black uppercase tracking-widest active:bg-white/10',
            copied ? 'text-green-300' : 'text-white/65'
          )}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'Copied' : 'Copy exercise name'}
        </button>
        <span className="text-fluid-label font-mono text-white/30 uppercase tracking-widest">How to</span>
        <p className="text-fluid-ui text-white/80 leading-relaxed">{ex.instruction}</p>
      </div>

      <div className="flex gap-4">
        <div className="flex flex-col gap-1 px-4 py-3 rounded-xl bg-white/5 flex-1">
          <span className="text-fluid-label font-mono text-white/30 uppercase tracking-widest">Unit</span>
          <span className="text-fluid-ui font-black uppercase text-white">{ex.unit === 'seconds' ? 'Seconds' : 'Reps'}</span>
        </div>
        <div className="flex flex-col gap-1 px-4 py-3 rounded-xl bg-white/5 flex-1">
          <span className="text-fluid-label font-mono text-white/30 uppercase tracking-widest">Type</span>
          <span className={cn('text-fluid-ui font-black uppercase', getWorkoutTypeTone(ex.workoutType))}>{context.day?.label ?? formatWorkoutType(ex.workoutType)}</span>
        </div>
      </div>

      {context.day && context.routine && (
        (() => {
          const assignment = getRoutineDayExercises(context.routine, context.day, context.profile).find(({ exercise }) => exercise.key === exerciseKey);
          if (!assignment?.chain.prescription) return null;
          const prescription = { exerciseKey, ...assignment.chain.prescription };
          const guidance = getWorkbookProgressionGuidance(exerciseKey, prescription, context.data);
          return (
            <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-fluid-label font-mono uppercase text-white/35">Prescription</span>
                <span className="text-fluid-ui font-black text-white">{getChainSetCount(assignment.chain, 3)} × {prescription.minReps}-{prescription.maxReps}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-fluid-label font-mono uppercase">
                <span className="text-white/45">RIR <b className="text-white/80">{prescription.targetRir}</b></span>
                <span className="text-white/45">Rest <b className="text-white/80">{prescription.restLabel}</b></span>
                <span className="text-white/45">Priority <b className="text-white/80">{assignment.chain.priority}</b></span>
                <span className="text-white/45">Next <b className="text-white/80">{guidance.label}</b></span>
              </div>
              <p className="text-fluid-label leading-relaxed text-white/55">{guidance.detail}</p>
              <p className="text-fluid-label leading-relaxed text-white/45">{prescription.cue}</p>
              {assignment.chain.alternatives && assignment.chain.alternatives.length > 0 && (
                <p className="text-fluid-label font-mono uppercase text-white/30">Alternatives: {assignment.chain.alternatives.join(', ')}</p>
              )}
            </div>
          );
        })()
      )}
    </WatchScreen>
  );
}

function ExerciseDetailLoading() {
  return (
    <div className="flex h-full items-center justify-center bg-black">
      <span className="text-fluid-label font-black uppercase tracking-widest text-white/30">Loading exercise</span>
    </div>
  );
}
