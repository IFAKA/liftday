'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { WorkoutState, WorkoutData, ExerciseKey, Exercise, StorageAdapter, UserProfile, SetEntry, setEntryReps, setEntryWeight } from '@/lib/types';
import { EXERCISES, REST_DURATION } from '@/lib/constants';
import { formatDateKey, getWeekNumber, getSetsForWeek, getPreviousExerciseSessionDate } from '@/lib/workout-utils';
import { getTargets, getWeightTarget, evaluateTierProgress } from '@/lib/progression';
import { getWorkoutOccurrenceIndex, getWorkoutType } from '@/lib/schedule';
import { pwaStorage, loadUserProfile, saveUserProfile } from '@/lib/storage';
import { getChainsForRoutine, getProgressionPath, resolveExerciseKey, resolveExerciseKeyWithEquipment } from '@/lib/tiers';
import { EquipmentKey, getRequiredEquipment } from '@/lib/equipment';
import { getRoutine } from '@/lib/routines';
import { traceLiftDay } from '@/lib/debug-trace';
import { getResolvedSessionPlan } from '@/lib/routine-plan';
import { optimizeRoutineForFrontier } from '@/lib/frontier-optimizer';
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
  currentWeightTarget: number;
  previousRep: number | null;
  previousWeight: number | null;
  flashColor: 'green' | 'red' | null;
  sessionReps: Record<string, SetEntry[]>;
  weekNumber: number;
  data: WorkoutData;
  totalExercises: number;
  totalPlannedSets: number;
  completedPlannedSets: number;
  exercises: Exercise[];
  nextExerciseName: string;
  nextExerciseAfterRestName: string | null;
  timerPaused: boolean;
  advancedTiers: string[];
  hasSwapAlternative: boolean;
  startWorkout: () => void;
  logSet: (reps: number, weight?: number) => void;
  skipTimer: () => void;
  quitWorkout: () => void;
  refreshData: () => void;
  finishTransition: () => void;
  togglePauseTimer: () => void;
  undoLastSet: () => void;
  swapCurrentForOccupied: () => void;
  requeueCurrent: () => void;
  handleMachineOccupied: () => void;
}

export function useWorkout(date: Date): UseWorkoutReturn {
  const storageAdapter: StorageAdapter = pwaStorage;

  const [state, setState] = useState<WorkoutState>('idle');
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(0);
  const [timer, setTimer] = useState(REST_DURATION);
  const [sessionReps, setSessionReps] = useState<Record<string, SetEntry[]>>({});
  const [data, setData] = useState<WorkoutData>({});
  const [flashColor, setFlashColor] = useState<'green' | 'red' | null>(null);
  const [nextExerciseName, setNextExerciseName] = useState('');
  const [firstSessionDate, setFirstSessionDate] = useState<string | null>(null);
  const [timerPaused, setTimerPaused] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [advancedTiers, setAdvancedTiers] = useState<string[]>([]);
  const [unavailableEquipment, setUnavailableEquipment] = useState<EquipmentKey[]>([]);
  const [skippedChainIndices, setSkippedChainIndices] = useState<Set<number>>(new Set());
  const [requeuedExercises, setRequeuedExercises] = useState<{ exercise: Exercise; setCount: number }[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownPlayedRef = useRef<Set<number>>(new Set());
  const timerEndRef = useRef<number | null>(null);
  const timerPauseStartRef = useRef<number | null>(null);
  const sessionRepsRef = useRef<Record<string, SetEntry[]>>({});
  const userProfileRef = useRef<UserProfile | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const restDurationRef = useRef(REST_DURATION);

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
      restDurationRef.current = profile?.restDuration ?? REST_DURATION;
    }
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dateKey = formatDateKey(date);
  const weekNumber = getWeekNumber(firstSessionDate, date);
  const setsPerExercise = getSetsForWeek(weekNumber, userProfile?.setsPerExercise);

  const { workoutType, workoutOccurrenceIndex, derivedPlan } = useMemo(() => {
    const baseRoutine = getRoutine(userProfile?.activeRoutine ?? 'calisthenics');
    const routine = optimizeRoutineForFrontier(baseRoutine, userProfile, data, setsPerExercise).routine;
    const wt = getWorkoutType(date, routine.schedule);
    if (wt === 'rest') {
      return {
        workoutType: wt,
        workoutOccurrenceIndex: null,
        derivedPlan: [] as { exercise: Exercise; setCount: number; chainIndex: number }[],
      };
    }
    const occurrenceIndex = getWorkoutOccurrenceIndex(date, routine.schedule);
    const chains = getChainsForRoutine(routine, wt, occurrenceIndex ?? undefined);
    const tiers = userProfile?.tiers ?? {};
    const activeChains = chains.filter((_, chainIdx) => !skippedChainIndices.has(chainIdx));
    const chainIndexLookup = new Map(activeChains.map((chain) => [chain.slotId, chains.indexOf(chain)]));
    const plan = getResolvedSessionPlan(
      routine,
      wt,
      activeChains,
      tiers,
      setsPerExercise,
      unavailableEquipment
    ).map((item) => ({
      exercise: item.exercise,
      setCount: item.setCount,
      chainIndex: chainIndexLookup.get(item.chain.slotId) ?? item.chainIndex,
    }));
    return { workoutType: wt, workoutOccurrenceIndex: occurrenceIndex, derivedPlan: plan };
  }, [date, userProfile, data, unavailableEquipment, skippedChainIndices, setsPerExercise]);

  const exercisePlan = useMemo(() => [...derivedPlan, ...requeuedExercises.map((item) => ({
    exercise: item.exercise,
    setCount: item.setCount,
    chainIndex: -1,
  }))], [derivedPlan, requeuedExercises]);
  const exercises = useMemo(() => exercisePlan.map((item) => item.exercise), [exercisePlan]);
  const currentSetCount = exercisePlan[exerciseIndex]?.setCount ?? setsPerExercise;
  const totalPlannedSets = exercisePlan.reduce((sum, item) => sum + item.setCount, 0);
  const completedPlannedSets = exercisePlan
    .slice(0, exerciseIndex)
    .reduce((sum, item) => sum + item.setCount, currentSet);

  const currentExercise = exercises[exerciseIndex];
  const targets = currentExercise ? getTargets(currentExercise.key, weekNumber, date, data) : [];
  const previousLoggedSet = useMemo(() => {
    if (!currentExercise || currentSet === 0) return null;
    const loggedSets = sessionReps[currentExercise.key] ?? [];
    return loggedSets[currentSet - 1] ?? null;
  }, [currentExercise, currentSet, sessionReps]);
  const currentTarget = previousLoggedSet !== null
    ? setEntryReps(previousLoggedSet)
    : targets[currentSet] ?? targets[0] ?? 10;
  const currentWeightTarget = useMemo(() => {
    if (!currentExercise || currentExercise.unit !== 'weighted') return 0;
    const previousWeight = previousLoggedSet !== null ? setEntryWeight(previousLoggedSet) : null;
    if (previousWeight !== null) return previousWeight;
    return getWeightTarget(currentExercise.key, date, data);
  }, [currentExercise, previousLoggedSet, date, data]);

  const previousEntry = useMemo(() => {
    if (!currentExercise) return null;
    const prev = getPreviousExerciseSessionDate(date, data, currentExercise.key as ExerciseKey);
    if (!prev) return null;
    const sets = data[prev]?.[currentExercise.key as ExerciseKey];
    return sets && sets.length > currentSet ? sets[currentSet] : null;
  }, [data, date, currentExercise, currentSet]);

  const previousRep = previousEntry !== null ? setEntryReps(previousEntry) : null;
  const previousWeight = previousEntry !== null ? setEntryWeight(previousEntry) : null;

  useEffect(() => { if (state !== 'resting') setTimerPaused(false); }, [state]);

  useEffect(() => {
    if (state === 'resting' && timer > 0 && !timerPaused) {
      if (timer === restDurationRef.current) {
        countdownPlayedRef.current = new Set();
        timerEndRef.current = Date.now() + restDurationRef.current * 1000;
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
  }, [state, timer === restDurationRef.current, timerPaused]);

  const saveAndComplete = useCallback(async () => {
    const reps = sessionRepsRef.current;
    const session: WorkoutData[string] = {
      logged_at: new Date().toISOString(),
      started_at: startedAtRef.current ?? undefined,
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
      const baseRoutine = getRoutine(userProfileRef.current.activeRoutine ?? 'calisthenics');
      const routine = optimizeRoutineForFrontier(baseRoutine, userProfileRef.current, data, setsPerExercise).routine;
      const chains = getChainsForRoutine(routine, workoutType, workoutOccurrenceIndex ?? undefined);
      const oldProfile = userProfileRef.current;
      let updatedProfile = oldProfile;
      for (const chain of chains) {
        if (!chain.fixed) {
          const exerciseKey = resolveExerciseKey(chain, updatedProfile.tiers);
          const sessionExReps = reps[exerciseKey] ?? [];
          updatedProfile = evaluateTierProgress(chain.slotId, sessionExReps, updatedProfile, chain, weekNumber);
        }
      }
      // Detect tier advances: slots where tier index increased
      const advanced: string[] = [];
      for (const chain of chains) {
        if (!chain.fixed) {
          const oldTier = oldProfile.tiers[chain.slotId] ?? 0;
          const newTier = updatedProfile.tiers[chain.slotId] ?? 0;
          if (newTier > oldTier) {
            const newExKey = getProgressionPath(chain)[newTier];
            const exName = EXERCISES.find((e) => e.key === newExKey)?.name;
            if (exName) advanced.push(exName);
          }
        }
      }
      setAdvancedTiers(advanced);
      saveUserProfile(updatedProfile);
      userProfileRef.current = updatedProfile;
      setUserProfile(updatedProfile);
    }

    playSessionComplete();
    setState('complete');
  }, [dateKey, weekNumber, exercises, workoutType, workoutOccurrenceIndex, storageAdapter, data, setsPerExercise]);

  const advanceAfterRest = useCallback(() => {
    const nextSet = currentSet + 1;
    if (nextSet < currentSetCount) {
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
  }, [currentSet, currentSetCount, exerciseIndex, exercises, saveAndComplete]);

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
    startedAtRef.current = new Date().toISOString();
    sessionRepsRef.current = {};
    setExerciseIndex(0);
    setCurrentSet(0);
    setSessionReps({});
    setState('exercising');
    traceLiftDay('workout.start', {
      dateKey,
      workoutType,
      exerciseCount: exercises.length,
      firstExercise: exercises[0]?.name ?? null,
    });
  }, [dateKey, exercises, workoutType]);

  const logSet = useCallback((reps: number, weight?: number) => {
    if (!currentExercise) return;
    const key = currentExercise.key;
    const entry: SetEntry = weight !== undefined ? { reps, weight } : reps;
    const hitTarget = reps >= currentTarget;
    setFlashColor(hitTarget ? 'green' : 'red');
    playSetLogged(hitTarget);
    setTimeout(() => setFlashColor(null), 600);

    const newReps = { ...sessionRepsRef.current, [key]: [...(sessionRepsRef.current[key] || []), entry] };
    sessionRepsRef.current = newReps;
    setSessionReps(newReps);

    const isLastSet = currentSet + 1 >= currentSetCount;
    const isLastExercise = exerciseIndex + 1 >= exercises.length;

    setTimeout(() => {
      if (isLastSet && isLastExercise) {
        saveAndComplete();
      } else {
        setTimer(restDurationRef.current);
        setState('resting');
      }
    }, 700);
  }, [currentExercise, currentSet, currentSetCount, exerciseIndex, exercises, currentTarget, saveAndComplete]);

  const skipTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (currentSet + 1 < currentSetCount) playSkip();
    traceLiftDay('workout.rest.skip', {
      exerciseIndex,
      exerciseName: currentExercise?.name ?? null,
      currentSet,
      setsPerExercise: currentSetCount,
      totalExercises: exercises.length,
    });
    advanceAfterRest();
  }, [advanceAfterRest, currentExercise?.name, currentSet, exerciseIndex, exercises.length, currentSetCount]);

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

  const hasSwapAlternative = useMemo(() => {
    if (exerciseIndex >= derivedPlan.length) return false;
    const ex = derivedPlan[exerciseIndex]?.exercise;
    if (!ex) return false;
    const required = getRequiredEquipment(ex.key);
    if (required.length === 0) return false;
    const newUnavailable = [...new Set([...unavailableEquipment, ...required])];
    const baseRoutine = getRoutine(userProfile?.activeRoutine ?? 'calisthenics');
    const routine = optimizeRoutineForFrontier(baseRoutine, userProfile, data, setsPerExercise).routine;
    if (workoutType === 'rest') return false;
    const chains = getChainsForRoutine(routine, workoutType, workoutOccurrenceIndex ?? undefined);
    const chainIdx = derivedPlan[exerciseIndex]?.chainIndex;
    const chain = chains[chainIdx];
    if (!chain) return false;
    const tiers = userProfile?.tiers ?? {};
    const newKey = resolveExerciseKeyWithEquipment(chain, tiers, newUnavailable, routine.id === 'gym');
    return newKey !== ex.key;
  }, [derivedPlan, exerciseIndex, unavailableEquipment, userProfile, data, setsPerExercise, workoutType, workoutOccurrenceIndex]);

  const swapCurrentForOccupied = useCallback(() => {
    const ex = exercises[exerciseIndex];
    if (!ex) return;
    const required = getRequiredEquipment(ex.key);
    setUnavailableEquipment((prev) => [...new Set([...prev, ...required])]);
  }, [exercises, exerciseIndex]);

  const requeueCurrent = useCallback(() => {
    const ex = exercises[exerciseIndex];
    if (!ex) return;
    traceLiftDay('workout.exercise.requeue', {
      exerciseIndex,
      exerciseName: ex.name,
      derivedExerciseCount: derivedPlan.length,
      totalExercises: exercises.length,
      chainIndex: derivedPlan[exerciseIndex]?.chainIndex ?? null,
    });
    if (exerciseIndex < derivedPlan.length) {
      const chainIdx = derivedPlan[exerciseIndex]?.chainIndex;
      if (chainIdx === undefined) return;
      setSkippedChainIndices((prev) => new Set([...prev, chainIdx]));
      setRequeuedExercises((prev) => [...prev, { exercise: ex, setCount: currentSetCount }]);
      setCurrentSet(0);
      // After re-derive, exerciseIndex unchanged but now points to the next exercise
    } else {
      // Already in the requeued section — skip it entirely
      const nextIdx = exerciseIndex + 1;
      if (nextIdx >= exercises.length) {
        saveAndComplete();
      } else {
        setExerciseIndex(nextIdx);
        setCurrentSet(0);
      }
    }
  }, [exercises, exerciseIndex, derivedPlan, currentSetCount, saveAndComplete]);

  const handleMachineOccupied = useCallback(() => {
    if (hasSwapAlternative) {
      swapCurrentForOccupied();
    } else {
      requeueCurrent();
    }
  }, [hasSwapAlternative, swapCurrentForOccupied, requeueCurrent]);

  const nextExerciseAfterRestName = useMemo(() => {
    if (state !== 'resting') return null;
    const isLastSet = currentSet + 1 >= currentSetCount;
    if (!isLastSet) return null;
    return exercises[exerciseIndex + 1]?.name ?? null;
  }, [state, currentSet, currentSetCount, exercises, exerciseIndex]);

  return {
    state, exerciseIndex, currentSet, setsPerExercise: currentSetCount, timer, currentExercise, currentTarget,
    currentWeightTarget, previousRep, previousWeight, flashColor, sessionReps, weekNumber, data,
    totalExercises: exercises.length, totalPlannedSets, completedPlannedSets,
    exercises, nextExerciseName, nextExerciseAfterRestName,
    timerPaused, advancedTiers,
    startWorkout, logSet, skipTimer, quitWorkout, refreshData, finishTransition, togglePauseTimer, undoLastSet,
    swapCurrentForOccupied, requeueCurrent, hasSwapAlternative, handleMachineOccupied,
  };
}
