'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MOBILITY_EXERCISES, MOBILITY_DONE_KEY } from '@/lib/constants';
import { formatDateKey } from '@/lib/workout-utils';
import { unlockAudio, playStart, playCountdownTick, playNextExercise, playSkip, playMobilityComplete } from '@/lib/audio';
import { traceLiftDay } from '@/lib/debug-trace';

function isMobilityDoneToday(): boolean {
  try {
    const saved = localStorage.getItem(MOBILITY_DONE_KEY);
    return saved === formatDateKey(new Date());
  } catch {
    return false;
  }
}

function saveMobilityDone(): void {
  try {
    localStorage.setItem(MOBILITY_DONE_KEY, formatDateKey(new Date()));
  } catch {
    // ignore
  }
}

export function useMobility() {
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [side, setSide] = useState<'left' | 'right' | null>(null);
  const [isComplete, setIsComplete] = useState(() => isMobilityDoneToday());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownPlayedRef = useRef<Set<string>>(new Set());

  const exercise = MOBILITY_EXERCISES[exerciseIndex];

  const completeMobility = useCallback((reason: string) => {
    traceLiftDay('mobility.complete', { reason, exerciseIndex, exerciseName: exercise?.name ?? null });
    setIsActive(false);
    setIsComplete(true);
    saveMobilityDone();
    playMobilityComplete();
  }, [exercise?.name, exerciseIndex]);

  const advanceMobility = useCallback((reason: string) => {
    traceLiftDay('mobility.advance.request', {
      reason,
      exerciseIndex,
      exerciseName: exercise?.name ?? null,
      side,
      timer,
    });

    if (exercise?.sides && side === 'left') {
      playNextExercise();
      setSide('right');
      setTimer(exercise.duration);
      traceLiftDay('mobility.advance.side', {
        reason,
        exerciseIndex,
        exerciseName: exercise.name,
        nextSide: 'right',
        nextTimer: exercise.duration,
      });
      return;
    }

    const next = exerciseIndex + 1;
    if (next < MOBILITY_EXERCISES.length) {
      playNextExercise();
      const nextEx = MOBILITY_EXERCISES[next];
      setExerciseIndex(next);
      setTimer(nextEx.duration);
      setSide(nextEx.sides ? 'left' : null);
      traceLiftDay('mobility.advance.exercise', {
        reason,
        fromIndex: exerciseIndex,
        toIndex: next,
        nextExerciseName: nextEx.name,
        nextSide: nextEx.sides ? 'left' : null,
        nextTimer: nextEx.duration,
      });
      return;
    }

    completeMobility(reason);
  }, [completeMobility, exercise, exerciseIndex, side, timer]);

  const startMobility = useCallback(() => {
    unlockAudio();
    playStart();
    setExerciseIndex(0);
    setIsComplete(false);
    const first = MOBILITY_EXERCISES[0];
    setTimer(first.duration);
    setSide(first.sides ? 'left' : null);
    setIsActive(true);
    traceLiftDay('mobility.start', {
      exerciseIndex: 0,
      exerciseName: first.name,
      timer: first.duration,
      side: first.sides ? 'left' : null,
    });
  }, []);

  const pause = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);

  useEffect(() => {
    if (isActive && !isPaused && timer > 0) {
      timerRef.current = setInterval(() => {
        setTimer((t) => {
          const next = t - 1;
          const tickKey = `${exerciseIndex}-${side}-${next}`;
          if (next <= 3 && next > 0 && !countdownPlayedRef.current.has(tickKey)) {
            countdownPlayedRef.current.add(tickKey);
            playCountdownTick(next);
          }
          return next;
        });
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }

    /* eslint-disable react-hooks/set-state-in-effect */
    if (isActive && timer === 0) {
      advanceMobility('timer');
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [advanceMobility, isActive, isPaused, timer, exerciseIndex, side]);

  const quit = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
    setExerciseIndex(0);
    setTimer(0);
    setSide(null);
    traceLiftDay('mobility.quit', { exerciseIndex, exerciseName: exercise?.name ?? null, side, timer });
  }, [exercise?.name, exerciseIndex, side, timer]);

  const skip = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    playSkip();
    advanceMobility('skip');
  }, [advanceMobility]);

  return {
    exercise,
    exerciseIndex,
    timer,
    side,
    isActive,
    isPaused,
    isComplete,
    totalExercises: MOBILITY_EXERCISES.length,
    startMobility,
    skip,
    pause,
    resume,
    quit,
  };
}
