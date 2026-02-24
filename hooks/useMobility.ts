'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MOBILITY_EXERCISES, MOBILITY_DONE_KEY } from '@/lib/constants';
import { formatDateKey } from '@/lib/workout-utils';
import { unlockAudio, playStart, playCountdownTick, playNextExercise, playSkip, playMobilityComplete } from '@/lib/audio';

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

  const startMobility = useCallback(() => {
    unlockAudio();
    playStart();
    setExerciseIndex(0);
    setIsComplete(false);
    const first = MOBILITY_EXERCISES[0];
    setTimer(first.duration);
    setSide(first.sides ? 'left' : null);
    setIsActive(true);
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
      if (exercise?.sides && side === 'left') {
        playNextExercise();
        setSide('right');
        setTimer(exercise.duration);
      } else {
        const next = exerciseIndex + 1;
        if (next < MOBILITY_EXERCISES.length) {
          playNextExercise();
          setExerciseIndex(next);
          const nextEx = MOBILITY_EXERCISES[next];
          setTimer(nextEx.duration);
          setSide(nextEx.sides ? 'left' : null);
        } else {
          setIsActive(false);
          setIsComplete(true);
          saveMobilityDone();
          playMobilityComplete();
        }
      }
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isActive, isPaused, timer, exercise, exerciseIndex, side]);

  const quit = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
    setExerciseIndex(0);
    setTimer(0);
    setSide(null);
  }, []);

  const skip = useCallback(() => {
    playSkip();
    setTimer(0);
  }, []);

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
