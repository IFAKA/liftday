'use client';

import { CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { EXERCISES } from '@/lib/constants';
import { WorkoutData } from '@/lib/types';

type SessionCompleteProps =
  | {
      mode: 'workout';
      sessionReps: Record<string, number[]>;
      data: WorkoutData;
      date: Date;
      advancedTiers?: string[];
      onDone: () => void;
    }
  | { mode: 'mobility'; date: Date; weekCompleted: number; weekTotal: number; nextTraining: string | null; onDone: () => void };

export function SessionComplete(props: SessionCompleteProps) {
  const isWorkout = props.mode === 'workout';
  const workoutPropsTyped = isWorkout ? (props as Extract<typeof props, { mode: 'workout' }>) : null;
  const mobilityProps = !isWorkout ? (props as Extract<typeof props, { mode: 'mobility' }>) : null;

  const totalReps = isWorkout && workoutPropsTyped
    ? EXERCISES.reduce((sum, ex) => {
        const reps = workoutPropsTyped.sessionReps[ex.key];
        return sum + (reps ? reps.reduce((s, r) => s + r, 0) : 0);
      }, 0)
    : 0;

  return (
    <div className="flex flex-col items-center justify-between w-full h-full bg-black px-safe pt-safe pb-safe overflow-hidden relative">
      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 py-8">
        <CheckCircle2
          className="w-24 h-24 sm:w-28 sm:h-28 text-green-500 mb-4"
          style={{ animation: 'bounce-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1) backwards' }}
        />
        
        <h1 className="text-fluid-label font-black tracking-[0.2em] uppercase text-white/80 mb-3 text-center">
          {isWorkout ? 'SESSION COMPLETE' : 'MOBILITY COMPLETE'}
        </h1>
        
        <p className="text-fluid-timer leading-none font-black tracking-tighter tabular-nums text-white text-center">
          {isWorkout ? totalReps : `${mobilityProps?.weekCompleted}/${mobilityProps?.weekTotal}`}
        </p>
        <p className="text-fluid-ui font-black tracking-[0.1em] uppercase text-white/60 text-center mt-2">
          {isWorkout ? 'TOTAL REPS' : 'DAYS DONE'}
        </p>

        {isWorkout && workoutPropsTyped?.advancedTiers && workoutPropsTyped.advancedTiers.length > 0 && (
          <Badge variant="ghost" className="mt-8 bg-green-500/10 border-green-500/20 px-6 py-3 rounded-2xl text-fluid-label text-green-400 uppercase tracking-widest font-black">
            ↑ LEVEL UP: {workoutPropsTyped.advancedTiers[0]}
          </Badge>
        )}
      </div>

      <div className="w-full px-4 pb-safe mb-4 shrink-0 z-10">
        <Button
          onClick={props.onDone}
          className="w-full btn-mobile-accessible rounded-full font-black uppercase tracking-tight bg-white text-black active:scale-95 transition-all shadow-xl"
        >
          DONE
        </Button>
      </div>
    </div>
  );
}
