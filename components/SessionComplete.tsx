'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { PrepTimer } from './PrepTimer';
import { CompletionSummaryScreen } from './CompletionSummaryScreen';
import { EXERCISES } from '@/lib/constants';
import { STRETCH_DURATION_SECONDS } from '@/lib/constants';
import { WorkoutData, SetEntry, setEntryReps } from '@/lib/types';
import { useCountdownTimer } from '@/hooks/useCountdownTimer';

type SessionCompleteProps =
  | {
      mode: 'workout';
      sessionReps: Record<string, SetEntry[]>;
      data: WorkoutData;
      date: Date;
      advancedTiers?: string[];
      onDone: () => void;
    }
  | { mode: 'mobility'; date: Date; weekCompleted: number; weekTotal: number; nextTraining: string | null; onDone: () => void };

export function SessionComplete(props: SessionCompleteProps) {
  const isWorkout = props.mode === 'workout';
  const [showStretchTimer, setShowStretchTimer] = useState(false);
  const stretchTimer = useCountdownTimer({
    initialSeconds: STRETCH_DURATION_SECONDS,
    autoStart: false,
  });
  const workoutPropsTyped = isWorkout ? (props as Extract<typeof props, { mode: 'workout' }>) : null;
  const mobilityProps = !isWorkout ? (props as Extract<typeof props, { mode: 'mobility' }>) : null;

  const exitStretchTimer = () => {
    stretchTimer.pause();
    stretchTimer.reset();
    setShowStretchTimer(false);
  };

  if (isWorkout && showStretchTimer) {
    return (
      <PrepTimer
        mode="stretch"
        seconds={stretchTimer.seconds}
        totalSeconds={STRETCH_DURATION_SECONDS}
        isRunning={stretchTimer.isRunning}
        onStartTimer={stretchTimer.start}
        onRepeat={stretchTimer.repeat}
        onPrimary={exitStretchTimer}
      />
    );
  }

  const totalReps = isWorkout && workoutPropsTyped
    ? EXERCISES.reduce((sum, ex) => {
        const sets = workoutPropsTyped.sessionReps[ex.key];
        return sum + (sets ? sets.reduce<number>((s, e) => s + setEntryReps(e), 0) : 0);
      }, 0)
    : 0;

  return (
    <CompletionSummaryScreen
      icon={(
        <CheckCircle2
          className="mb-4 h-24 w-24 text-green-500 sm:h-28 sm:w-28"
          style={{ animation: 'bounce-in 240ms var(--ease-out-ui) backwards' }}
        />
      )}
      title={isWorkout ? 'SESSION COMPLETE' : 'MOBILITY COMPLETE'}
      metric={isWorkout ? totalReps : `${mobilityProps?.weekCompleted}/${mobilityProps?.weekTotal}`}
      metricLabel={isWorkout ? 'TOTAL REPS' : 'DAYS DONE'}
      badge={isWorkout && workoutPropsTyped?.advancedTiers && workoutPropsTyped.advancedTiers.length > 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3">
          <Badge variant="ghost" className="bg-green-500/10 border-green-500/20 px-6 py-3 rounded-2xl text-fluid-label text-green-400 uppercase tracking-widest font-black">
            ↑ LEVEL UP: {workoutPropsTyped.advancedTiers[0]}
          </Badge>
        </div>
      ) : undefined}
      secondaryActions={isWorkout ? [
        {
          label: '30s Stretch',
          onClick: () => {
            stretchTimer.reset();
            setShowStretchTimer(true);
          },
        },
      ] : undefined}
      onDone={props.onDone}
    />
  );
}
