'use client';

import { CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
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
    <div className="flex flex-col items-center justify-between w-full h-full bg-black p-2 overflow-hidden relative">
      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 py-2">
        <CheckCircle2
          className="w-12 h-12 text-green-500 mb-1"
          style={{ animation: 'bounce-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1) backwards' }}
        />
        
        <h1 className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40 mb-1 text-center">
          {isWorkout ? 'SUMMARY' : 'MOBILITY'}
        </h1>
        
        <p className="text-[64px] leading-none font-black tracking-tighter tabular-nums text-white text-center">
          {isWorkout ? totalReps : `${mobilityProps?.weekCompleted}/${mobilityProps?.weekTotal}`}
        </p>
        <p className="text-[9px] font-bold tracking-[0.1em] uppercase text-white/30 text-center">
          {isWorkout ? 'TOTAL REPS' : 'DAYS DONE'}
        </p>

        {isWorkout && workoutPropsTyped?.advancedTiers && workoutPropsTyped.advancedTiers.length > 0 && (
          <p className="text-[8px] text-green-400 uppercase tracking-widest font-mono text-center mt-2 px-1">
            ↑ LEVEL UP: {workoutPropsTyped.advancedTiers[0]}
          </p>
        )}
      </div>

      <div className="w-full shrink-0 z-10">
        <Button
          onClick={props.onDone}
          className="w-full h-11 rounded-full text-lg font-black uppercase tracking-tight bg-white text-black active:scale-95 transition-all shadow-lg"
        >
          DONE
        </Button>
      </div>
    </div>
  );
}
