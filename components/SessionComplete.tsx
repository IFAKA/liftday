'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Play } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { PrepTimer } from './PrepTimer';
import { EXERCISES } from '@/lib/constants';
import { STRETCH_DURATION_SECONDS } from '@/lib/constants';
import { WorkoutData, SetEntry, setEntryReps } from '@/lib/types';

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
  const [stretchActive, setStretchActive] = useState(false);
  const [stretchSeconds, setStretchSeconds] = useState(STRETCH_DURATION_SECONDS);
  const workoutPropsTyped = isWorkout ? (props as Extract<typeof props, { mode: 'workout' }>) : null;
  const mobilityProps = !isWorkout ? (props as Extract<typeof props, { mode: 'mobility' }>) : null;

  useEffect(() => {
    if (!stretchActive || stretchSeconds <= 0) return;
    const timer = setInterval(() => {
      setStretchSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [stretchActive, stretchSeconds]);

  useEffect(() => {
    if (!stretchActive || stretchSeconds > 0) return;
    const timeout = setTimeout(() => {
      setStretchActive(false);
      setStretchSeconds(STRETCH_DURATION_SECONDS);
    }, 600);
    return () => clearTimeout(timeout);
  }, [stretchActive, stretchSeconds]);

  if (isWorkout && stretchActive) {
    return (
      <PrepTimer
        mode="stretch"
        seconds={stretchSeconds}
        onCancel={() => {
          setStretchActive(false);
          setStretchSeconds(STRETCH_DURATION_SECONDS);
        }}
        onPrimary={() => {
          setStretchActive(false);
          setStretchSeconds(STRETCH_DURATION_SECONDS);
        }}
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
    <div className="flex flex-col items-center justify-between w-full h-full bg-black px-safe pt-safe pb-safe overflow-hidden relative">
      <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 py-8">
        <CheckCircle2
          className="w-24 h-24 sm:w-28 sm:h-28 text-green-500 mb-4"
          style={{ animation: 'bounce-in 240ms var(--ease-out-ui) backwards' }}
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

      <div className="w-full px-4 pb-safe mb-4 shrink-0 z-10 flex flex-col gap-3">
        {isWorkout && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-fluid-label font-mono font-black uppercase tracking-widest text-white/35">
                  Stretch timer
                </p>
                <p className="mt-1 font-mono text-fluid-ui font-black tabular-nums text-white">
                  0:30
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setStretchSeconds(STRETCH_DURATION_SECONDS);
                  setStretchActive(true);
                }}
                className="h-12 shrink-0 rounded-full border-white/20 bg-white/10 px-4 text-fluid-label font-black uppercase tracking-tight text-white/85 transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out-ui)] active:scale-95 active:bg-white/20"
              >
                <Play className="h-4 w-4 fill-current" />
                Start
              </Button>
            </div>
          </div>
        )}
        <Button
          onClick={props.onDone}
          className="w-full btn-mobile-accessible rounded-full font-black uppercase tracking-tight bg-white text-black active:scale-95 transition-transform duration-150 ease-[var(--ease-out-ui)] shadow-xl"
        >
          DONE
        </Button>
      </div>
    </div>
  );
}
