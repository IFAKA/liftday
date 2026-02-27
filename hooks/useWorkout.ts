'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { WorkoutState, WorkoutData, ExerciseKey, Exercise, StorageAdapter, UserProfile } from '@/lib/types';
import { EXERCISES, REST_DURATION } from '@/lib/constants';
import { formatDateKey, getWeekNumber, getSetsForWeek } from '@/lib/workout-utils';
import { getTargets, evaluateTierProgress } from '@/lib/progression';
import { getWorkoutType } from '@/lib/schedule';
import { pwaStorage, loadUserProfile, saveUserProfile } from '@/lib/storage';
import { getChainsForWorkout, resolveExerciseKey } from '@/lib/tiers';
import {
  unlockAudio, playStart, playSetLogged, playCountdownTick,
  playRestComplete, playNextExercise, playSkip, playSessionComplete,
  playExerciseReady, playUndo,
} from '@/lib/audio';

export interface UseWorkoutReturn {
  state: WorkoutState;
  exerciseIndex: number;
  currentSet: number;
  setsPerExercise: number;
  timer: number;
  currentExercise: Exercise | undefined;
  currentTarget: number;
  previousRep: number | null;
  flashColor: 'green' | 'red' | null;
  sessionReps: Record<string, number[]>;
  weekNumber: number;
  data: WorkoutData;
  totalExercises: number;
  nextExerciseName: string;
  timerPaused: boolean;
  startWorkout: () => void;
  logSet: (value: number) => void;
  skipTimer: () => void;
  quitWorkout: () => void;
  refreshData: () => void;
  finishTransition: () => void;
  togglePauseTimer: () => void;
  undoLastSet: () => void;
}

export function useWorkout(date: Date): UseWorkoutReturn {
  const storageAdapter: StorageAdapter = pwaStorage;

  const [state, setState] = useState<WorkoutState>('idle');
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(0);
  const [timer, setTimer] = useState(REST_DURATION);
  const [sessionReps, setSessionReps] = useState<Record<string, number[]>>({});
  const [data, setData] = useState<WorkoutData>({});
  const [flashColor, setFlashColor] = useState<'green' | 'red' | null>(null);
  const [nextExerciseName, setNextExerciseName] = useState('');
  const [firstSessionDate, setFirstSessionDate] = useState<string | null>(null);
  const [timerPaused, setTimerPaused] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownPlayedRef = useRef<Set<number>>(new Set());
  const timerEndRef = useRef<number | null>(null);
  const timerPauseStartRef = useRef<number | null>(null);
  const sessionRepsRef = useRef<Record<string, number[]>>({});
  const userProfileRef = useRef<UserProfile | null>(null);

  useEffect(() => {
    let mounted = true;
    Promise.all([storageAdapter.loadWorkoutData(), storageAdapter.getFirstSessionDate()]).then(
      ([loadedData, firstDate]) => {
        if (mounted) { setData(loadedData); setFirstSessionDate(firstDate); }
      }
    );
    const profile = loadUserProfile();
    if (mounted) {
      setUserProfile(profile);
      userProfileRef.current = profile;
    }
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dateKey = formatDateKey(date);
  const weekNumber = getWeekNumber(firstSessionDate, date);
  const setsPerExercise = getSetsForWeek(weekNumber);

  const { workoutType, exercises } = useMemo(() => {
    const wt = getWorkoutType(date);
    if (wt === 'rest') {
      return { workoutType: wt, exercises: [] as Exercise[] };
    }
    const chains = getChainsForWorkout(wt);
    const tiers = userProfile?.tiers ?? {};
    const exs = chains.map((chain) => {
      const key = resolveExerciseKey(chain, tiers);
      return EXERCISES.find((e) => e.key === key)!;
    }).filter(Boolean);
    return { workoutType: wt, exercises: exs };
  }, [date, userProfile]);

  const currentExercise = exercises[exerciseIndex];
  const targets = currentExercise ? getTargets(currentExercise.key, weekNumber, date, data) : [];
  const currentTarget = targets[currentSet] ?? targets[0] ?? 10;

  const previousRep = useMemo(() => {
    if (!currentExercise) return null;
    const prev = Object.keys(data).filter((d) => d < dateKey && data[d].logged_at).sort().reverse()[0];
    if (!prev) return null;
    const reps = data[prev]?.[currentExercise.key as ExerciseKey];
    return reps && reps.length > currentSet ? reps[currentSet] : null;
  }, [data, dateKey, currentExercise, currentSet]);

  useEffect(() => { if (state !== 'resting') setTimerPaused(false); }, [state]);

  useEffect(() => {
    if (state === 'resting' && timer > 0 && !timerPaused) {
      if (timer === REST_DURATION) {
        countdownPlayedRef.current = new Set();
        timerEndRef.current = Date.now() + REST_DURATION * 1000;
      }
      timerRef.current = setInterval(() => {
        const remaining = timerEndRef.current
          ? Math.max(0, Math.ceil((timerEndRef.current - Date.now()) / 1000))
          : 0;
        setTimer((t) => {
          if (remaining <= 0 || t <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            playRestComplete();
            advanceAfterRest();
            return 0;
          }
          if (remaining <= 3 && !countdownPlayedRef.current.has(remaining)) {
            countdownPlayedRef.current.add(remaining);
            playCountdownTick(remaining);
          }
          return remaining;
        });
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, timer === REST_DURATION, timerPaused]);

  const saveAndComplete = useCallback(async () => {
    const reps = sessionRepsRef.current;
    const session: WorkoutData[string] = {
      logged_at: new Date().toISOString(),
      week_number: weekNumber,
      workout_type: workoutType as Exclude<typeof workoutType, 'rest'>,
    };
    for (const ex of exercises) {
      if (reps[ex.key]) (session as Record<string, unknown>)[ex.key] = reps[ex.key];
    }
    await storageAdapter.saveSession(dateKey, session);
    await storageAdapter.setFirstSessionDate(dateKey);
    setData(await storageAdapter.loadWorkoutData());

    // Evaluate tier progress for non-fixed chains
    if (workoutType !== 'rest' && userProfileRef.current) {
      const chains = getChainsForWorkout(workoutType);
      let updatedProfile = userProfileRef.current;
      for (const chain of chains) {
        if (!chain.fixed) {
          const exerciseKey = resolveExerciseKey(chain, updatedProfile.tiers);
          const sessionExReps = reps[exerciseKey] ?? [];
          updatedProfile = evaluateTierProgress(chain.slotId, sessionExReps, updatedProfile, chain, weekNumber);
        }
      }
      saveUserProfile(updatedProfile);
      userProfileRef.current = updatedProfile;
      setUserProfile(updatedProfile);
    }

    playSessionComplete();
    setState('complete');
  }, [dateKey, weekNumber, exercises, workoutType, storageAdapter]);

  const advanceAfterRest = useCallback(() => {
    const nextSet = currentSet + 1;
    if (nextSet < setsPerExercise) {
      setCurrentSet(nextSet);
      setState('exercising');
    } else {
      const nextIdx = exerciseIndex + 1;
      if (nextIdx < exercises.length) {
        playNextExercise();
        setNextExerciseName(exercises[nextIdx].name);
        setExerciseIndex(nextIdx);
        setCurrentSet(0);
        setState('transitioning');
      } else {
        saveAndComplete();
      }
    }
  }, [currentSet, setsPerExercise, exerciseIndex, exercises, saveAndComplete]);

  // Catch up timer when returning from background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && state === 'resting' && !timerPaused && timerEndRef.current) {
        const remaining = Math.max(0, Math.ceil((timerEndRef.current - Date.now()) / 1000));
        if (remaining <= 0) {
          if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
          setTimer(0);
          playRestComplete();
          advanceAfterRest();
        } else {
          setTimer(remaining);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state, timerPaused, advanceAfterRest]);

  const finishTransition = useCallback(() => {
    playExerciseReady();
    setState('exercising');
  }, []);

  const startWorkout = useCallback(() => {
    unlockAudio();
    playStart();
    sessionRepsRef.current = {};
    setExerciseIndex(0);
    setCurrentSet(0);
    setSessionReps({});
    setState('exercising');
  }, []);

  const logSet = useCallback((value: number) => {
    if (!currentExercise) return;
    const key = currentExercise.key;
    const hitTarget = value >= currentTarget;
    setFlashColor(hitTarget ? 'green' : 'red');
    playSetLogged(hitTarget);
    setTimeout(() => setFlashColor(null), 600);

    const newReps = { ...sessionRepsRef.current, [key]: [...(sessionRepsRef.current[key] || []), value] };
    sessionRepsRef.current = newReps;
    setSessionReps(newReps);

    const isLastSet = currentSet + 1 >= setsPerExercise;
    const isLastExercise = exerciseIndex + 1 >= exercises.length;

    setTimeout(() => {
      if (isLastSet && isLastExercise) {
        saveAndComplete();
      } else {
        setTimer(REST_DURATION);
        setState('resting');
      }
    }, 700);
  }, [currentExercise, currentSet, setsPerExercise, exerciseIndex, exercises, currentTarget, saveAndComplete]);

  const skipTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (currentSet + 1 < setsPerExercise) playSkip();
    advanceAfterRest();
  }, [advanceAfterRest, currentSet, setsPerExercise]);

  const quitWorkout = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    sessionRepsRef.current = {};
    setState('idle');
    setExerciseIndex(0);
    setCurrentSet(0);
    setSessionReps({});
  }, []);

  const togglePauseTimer = useCallback(() => {
    setTimerPaused((p) => {
      if (p) {
        if (timerPauseStartRef.current !== null && timerEndRef.current !== null) {
          timerEndRef.current += Date.now() - timerPauseStartRef.current;
          timerPauseStartRef.current = null;
        }
      } else {
        timerPauseStartRef.current = Date.now();
      }
      return !p;
    });
  }, []);

  const undoLastSet = useCallback(() => {
    if (!currentExercise) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const key = currentExercise.key;
    const updated = { ...sessionRepsRef.current, [key]: (sessionRepsRef.current[key] || []).slice(0, -1) };
    sessionRepsRef.current = updated;
    setSessionReps(updated);
    playUndo();
    setTimer(REST_DURATION);
    setState('exercising');
  }, [currentExercise]);

  const refreshData = useCallback(() => {
    storageAdapter.loadWorkoutData().then(setData);
  }, [storageAdapter]);

  return {
    state, exerciseIndex, currentSet, setsPerExercise, timer, currentExercise, currentTarget,
    previousRep, flashColor, sessionReps, weekNumber, data, totalExercises: exercises.length, nextExerciseName, timerPaused,
    startWorkout, logSet, skipTimer, quitWorkout, refreshData, finishTransition, togglePauseTimer, undoLastSet,
  };
}
