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
    <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-black p-safe relative overflow-hidden">
      {/* Center Content */}
      <div className="flex flex-col items-center justify-center w-full max-w-sm px-4 flex-1">
        <CheckCircle2
          className="w-32 h-32 sm:w-40 sm:h-40 text-green-500 mb-8"
          style={{ animation: 'bounce-in 400ms cubic-bezier(0.34, 1.56, 0.64, 1) 100ms backwards' }}
        />
        
        <h1
          className="text-xl sm:text-2xl font-bold tracking-[0.2em] uppercase text-white/50 mb-2"
          style={{ animation: 'slide-up-in 300ms ease-out 200ms backwards' }}
        >
          {isWorkout ? 'SUMMARY' : 'MOBILITY DONE'}
        </h1>
        
        <p
          className="text-[80px] sm:text-[100px] leading-none font-black tracking-tighter tabular-nums text-white text-center"
          style={{ animation: 'slide-up-in 300ms ease-out 280ms backwards' }}
        >
          {isWorkout ? totalReps : `${mobilityProps?.weekCompleted}/${mobilityProps?.weekTotal}`}
        </p>
        <p
          className="text-lg sm:text-xl font-bold tracking-[0.1em] uppercase text-white/30 mt-2"
          style={{ animation: 'slide-up-in 300ms ease-out 360ms backwards' }}
        >
          {isWorkout ? 'TOTAL REPS' : 'DAYS'}
        </p>

        {isWorkout && workoutPropsTyped?.advancedTiers && workoutPropsTyped.advancedTiers.length > 0 && (
          <p
            className="text-xs text-green-400 uppercase tracking-widest font-mono text-center mt-8"
            style={{ animation: 'slide-up-in 260ms ease-out 440ms backwards' }}
          >
            ↑ LEVEL UP: {workoutPropsTyped.advancedTiers.join(', ')}
          </p>
        )}
      </div>

      {/* Primary Action Button (Edge-to-edge Pill) */}
      <div className="w-full absolute bottom-8 px-4 z-10">
        <Button
          onClick={props.onDone}
          className="w-full h-[68px] rounded-full text-2xl font-black uppercase tracking-tight bg-white text-black hover:bg-white/90 active:scale-95 transition-all shadow-lg"
          style={{ animation: 'slide-up-in 300ms ease-out 500ms backwards' }}
        >
          DONE
        </Button>
      </div>
    </div>
  );
}
