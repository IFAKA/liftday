'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { WorkoutState, WorkoutData, ExerciseKey, Exercise, StorageAdapter, UserProfile, SetEntry, setEntryReps, setEntryWeight, setEntryRir, ActiveWorkoutDraft, SMVExercisePrescription } from '@/lib/types';
import { EXERCISES, REST_DURATION } from '@/lib/constants';
import { formatDateKey, getWeekNumber, getSetsForWeek, getPreviousExerciseSessionDate } from '@/lib/workout-utils';
import { getTargets, getWeightTarget, evaluateTierProgress } from '@/lib/progression';
import { getWorkoutOccurrenceIndex, getWorkoutType } from '@/lib/schedule';
import { clearActiveWorkoutDraft, loadActiveWorkoutDraft, pwaStorage, saveActiveWorkoutDraft, loadUserProfile, saveUserProfile } from '@/lib/storage';
import { getChainsForRoutine, getProgressionPath, resolveExerciseKey, resolveExerciseKeyWithEquipment } from '@/lib/tiers';
import { EquipmentKey, getRequiredEquipment } from '@/lib/equipment';
import { getRoutine } from '@/lib/routines';
import { traceLiftDay } from '@/lib/debug-trace';
import { requireRestNotificationPermission, showRestCompleteNotification } from '@/lib/rest-notifications';
import { getResolvedSessionPlan } from '@/lib/routine-plan';
import { optimizeRoutineForFrontier } from '@/lib/frontier-optimizer';
import { evaluateDoubleProgression } from '@/lib/smv';
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
  currentPrescription: SMVExercisePrescription | null;
  previousRep: number | null;
  previousWeight: number | null;
  previousRir: number | null;
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
  startWorkout: () => Promise<void>;
  logSet: (reps: number, weight?: number, rir?: number) => void;
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
  const [hydrated, setHydrated] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownPlayedRef = useRef<Set<number>>(new Set());
  const timerEndRef = useRef<number | null>(null);
  const timerPauseStartRef = useRef<number | null>(null);
  const sessionRepsRef = useRef<Record<string, SetEntry[]>>({});
  const userProfileRef = useRef<UserProfile | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const restDurationRef = useRef(REST_DURATION);
  const restoredDraftRef = useRef(false);
  const restCompletionNotifiedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([storageAdapter.loadWorkoutData(), storageAdapter.getFirstSessionDate()]).then(
      ([loadedData, firstDate]) => {
        if (mounted) { setData(loadedData); setFirstSessionDate(firstDate); setHydrated(true); }
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
    const baseRoutine = getRoutine(userProfile?.activeRoutine ?? 'gym');
    const routine = optimizeRoutineForFrontier(baseRoutine, userProfile, data, setsPerExercise).routine;
    const wt = getWorkoutType(date, routine.schedule);
    if (wt === 'rest') {
      return {
        workoutType: wt,
        workoutOccurrenceIndex: null,
        derivedPlan: [] as { exercise: Exercise; setCount: number; chainIndex: number; prescription: SMVExercisePrescription }[],
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
      prescription: item.prescription,
    }));
    return { workoutType: wt, workoutOccurrenceIndex: occurrenceIndex, derivedPlan: plan };
  }, [date, userProfile, data, unavailableEquipment, skippedChainIndices, setsPerExercise]);

  const exercisePlan = useMemo(() => [...derivedPlan, ...requeuedExercises.map((item) => ({
    exercise: item.exercise,
    setCount: item.setCount,
    chainIndex: -1,
    prescription: derivedPlan.find((planItem) => planItem.exercise.key === item.exercise.key)?.prescription ?? {
      exerciseKey: item.exercise.key,
      sets: item.setCount,
      minReps: 8,
      maxReps: 12,
      targetRir: '1-2 RIR',
      targetRirMin: 1,
      targetRirMax: 2,
      restSeconds: restDurationRef.current,
      restLabel: `${restDurationRef.current}s`,
      cue: 'Clean reps. Stop at target RIR.',
    },
  }))], [derivedPlan, requeuedExercises]);
  const exercises = useMemo(() => exercisePlan.map((item) => item.exercise), [exercisePlan]);
  const currentSetCount = exercisePlan[exerciseIndex]?.setCount ?? setsPerExercise;
  const currentPrescription = exercisePlan[exerciseIndex]?.prescription ?? null;
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
    : currentPrescription?.minReps ?? targets[currentSet] ?? targets[0] ?? 10;
  const currentWeightTarget = useMemo(() => {
    if (!currentExercise || currentExercise.unit !== 'weighted') return 0;
    const previousWeight = previousLoggedSet !== null ? setEntryWeight(previousLoggedSet) : null;
    if (previousWeight !== null) return previousWeight;
    const baseWeight = getWeightTarget(currentExercise.key, date, data);
    if (!currentPrescription) return baseWeight;
    const prevDateKey = getPreviousExerciseSessionDate(date, data, currentExercise.key as ExerciseKey);
    const prevSets = prevDateKey ? data[prevDateKey]?.[currentExercise.key as ExerciseKey] : null;
    if (!prevSets) return baseWeight;
    const decision = evaluateDoubleProgression(prevSets, currentPrescription);
    return decision.increaseLoad ? baseWeight + getLoadJump(baseWeight) : baseWeight;
  }, [currentExercise, previousLoggedSet, date, data, currentPrescription]);

  const previousEntry = useMemo(() => {
    if (!currentExercise) return null;
    const prev = getPreviousExerciseSessionDate(date, data, currentExercise.key as ExerciseKey);
    if (!prev) return null;
    const sets = data[prev]?.[currentExercise.key as ExerciseKey];
    return sets && sets.length > currentSet ? sets[currentSet] : null;
  }, [data, date, currentExercise, currentSet]);

  const previousRep = previousEntry !== null ? setEntryReps(previousEntry) : null;
  const previousWeight = previousEntry !== null ? setEntryWeight(previousEntry) : null;
  const previousRir = previousEntry !== null ? setEntryRir(previousEntry) : null;

  useEffect(() => { if (state !== 'resting') setTimerPaused(false); }, [state]);

  useEffect(() => {
    if (!hydrated || restoredDraftRef.current || workoutType === 'rest' || exercises.length === 0) return;
    restoredDraftRef.current = true;
    const draft = loadActiveWorkoutDraft();
    if (!draft || draft.dateKey !== dateKey || draft.workoutType !== workoutType) {
      if (draft && draft.dateKey !== dateKey) clearActiveWorkoutDraft();
      return;
    }

    const requeued = draft.requeuedExercises
      .map((item) => {
        const exercise = EXERCISES.find((ex) => ex.key === item.exerciseKey);
        return exercise ? { exercise, setCount: item.setCount } : null;
      })
      .filter((item): item is { exercise: Exercise; setCount: number } => item !== null);

    sessionRepsRef.current = draft.sessionReps;
    startedAtRef.current = draft.startedAt;
    timerEndRef.current = draft.timerEndAt;
    setUnavailableEquipment(draft.unavailableEquipment as EquipmentKey[]);
    setSkippedChainIndices(new Set(draft.skippedChainIndices));
    setRequeuedExercises(requeued);
    setExerciseIndex(draft.exerciseIndex);
    setCurrentSet(draft.currentSet);
    setSessionReps(draft.sessionReps);
    setNextExerciseName(draft.nextExerciseName);
    setTimerPaused(draft.timerPaused);

    if (draft.state === 'resting' && !draft.timerPaused && draft.timerEndAt !== null) {
      const remaining = Math.max(0, Math.ceil((draft.timerEndAt - Date.now()) / 1000));
      if (remaining <= 0) {
        const setCount = exercisePlan[draft.exerciseIndex]?.setCount ?? setsPerExercise;
        if (draft.currentSet + 1 < setCount) {
          setCurrentSet(draft.currentSet + 1);
          setTimer(currentPrescription?.restSeconds ?? restDurationRef.current);
          setState('exercising');
          return;
        }
        const nextIdx = draft.exerciseIndex + 1;
        if (nextIdx < exercises.length) {
          setExerciseIndex(nextIdx);
          setCurrentSet(0);
          setNextExerciseName(exercises[nextIdx].name);
          setTimer(currentPrescription?.restSeconds ?? restDurationRef.current);
          setState('transitioning');
          return;
        }
      } else {
        setTimer(remaining);
      }
    } else {
      setTimer(draft.timer);
    }

    setState(draft.state);
  }, [currentPrescription, dateKey, exercisePlan, exercises, hydrated, setsPerExercise, workoutType]);

  const persistActiveDraft = useCallback((stateToPersist: ActiveWorkoutDraft['state']) => {
    if (workoutType === 'rest' || !startedAtRef.current) return;
    saveActiveWorkoutDraft({
      version: 1,
      dateKey,
      state: stateToPersist,
      exerciseIndex,
      currentSet,
      sessionReps: sessionRepsRef.current,
      startedAt: startedAtRef.current,
      workoutType,
      savedAt: new Date().toISOString(),
      timer,
      timerEndAt: timerEndRef.current,
      timerPaused,
      nextExerciseName,
      unavailableEquipment,
      skippedChainIndices: [...skippedChainIndices],
      requeuedExercises: requeuedExercises.map((item) => ({
        exerciseKey: item.exercise.key,
        setCount: item.setCount,
      })),
    });
  }, [
    currentSet,
    dateKey,
    exerciseIndex,
    nextExerciseName,
    requeuedExercises,
    skippedChainIndices,
    timer,
    timerPaused,
    unavailableEquipment,
    workoutType,
  ]);

  useEffect(() => {
    if (state === 'idle' || state === 'complete') return;
    persistActiveDraft(state);
  }, [state, sessionReps, persistActiveDraft]);

  useEffect(() => {
    const persistBeforeSuspend = () => {
      if (state !== 'idle' && state !== 'complete') persistActiveDraft(state);
    };
    const handleVisibilityChange = () => {
      if (document.hidden) persistBeforeSuspend();
    };
    window.addEventListener('pagehide', persistBeforeSuspend);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', persistBeforeSuspend);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state, persistActiveDraft]);

  const notifyRestCompleteIfHidden = useCallback(() => {
    if (restCompletionNotifiedRef.current) return;
    if (typeof document === 'undefined' || !document.hidden) return;

    const isLastSet = currentSet + 1 >= currentSetCount;
    const nextName = isLastSet
      ? exercises[exerciseIndex + 1]?.name
      : currentExercise?.name;

    restCompletionNotifiedRef.current = true;
    showRestCompleteNotification(nextName);
  }, [currentExercise?.name, currentSet, currentSetCount, exerciseIndex, exercises]);

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
            notifyRestCompleteIfHidden();
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
  }, [state, timer === restDurationRef.current, timerPaused, notifyRestCompleteIfHidden]);

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
      const baseRoutine = getRoutine(userProfileRef.current.activeRoutine ?? 'gym');
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
    clearActiveWorkoutDraft();
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
          notifyRestCompleteIfHidden();
          playRestComplete();
          advanceAfterRest();
        } else {
          setTimer(remaining);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state, timerPaused, advanceAfterRest, notifyRestCompleteIfHidden]);

  const finishTransition = useCallback(() => {
    playExerciseReady();
    setState('exercising');
  }, []);

  const startWorkout = useCallback(async () => {
    unlockAudio();
    await requireRestNotificationPermission();
    playStart();
    clearActiveWorkoutDraft();
    startedAtRef.current = new Date().toISOString();
    sessionRepsRef.current = {};
    timerEndRef.current = null;
    timerPauseStartRef.current = null;
    restCompletionNotifiedRef.current = false;
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

  const logSet = useCallback((reps: number, weight?: number, rir?: number) => {
    if (!currentExercise) return;
    const key = currentExercise.key;
    const entry: SetEntry = weight !== undefined ? { reps, weight, rir } : reps;
    const targetTop = currentPrescription?.maxReps ?? currentTarget;
    const hitTarget = reps >= targetTop && (rir === undefined || (rir >= (currentPrescription?.targetRirMin ?? 0) && rir <= (currentPrescription?.targetRirMax ?? 10)));
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
        restCompletionNotifiedRef.current = false;
        const restSeconds = currentPrescription?.restSeconds ?? restDurationRef.current;
        setTimer(restSeconds);
        timerEndRef.current = Date.now() + restSeconds * 1000;
        setState('resting');
      }
    }, 700);
  }, [currentExercise, currentSet, currentSetCount, exerciseIndex, exercises, currentPrescription, currentTarget, saveAndComplete]);

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
    clearActiveWorkoutDraft();
    sessionRepsRef.current = {};
    startedAtRef.current = null;
    timerEndRef.current = null;
    timerPauseStartRef.current = null;
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
    setTimer(currentPrescription?.restSeconds ?? REST_DURATION);
    setState('exercising');
  }, [currentExercise, currentPrescription]);

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
    const baseRoutine = getRoutine(userProfile?.activeRoutine ?? 'gym');
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
    currentWeightTarget, currentPrescription, previousRep, previousWeight, previousRir, flashColor, sessionReps, weekNumber, data,
    totalExercises: exercises.length, totalPlannedSets, completedPlannedSets,
    exercises, nextExerciseName, nextExerciseAfterRestName,
    timerPaused, advancedTiers,
    startWorkout, logSet, skipTimer, quitWorkout, refreshData, finishTransition, togglePauseTimer, undoLastSet,
    swapCurrentForOccupied, requeueCurrent, hasSwapAlternative, handleMachineOccupied,
  };
}

function getLoadJump(currentWeight: number): number {
  if (currentWeight < 20) return 1;
  if (currentWeight < 60) return 2.5;
  return 5;
}
