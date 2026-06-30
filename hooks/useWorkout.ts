'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { WorkoutState, WorkoutData, ExerciseKey, Exercise, StorageAdapter, UserProfile, SetEntry, setEntryReps, setEntryWeight, setEntryRir, ActiveWorkoutDraft, SMVExercisePrescription, AdaptiveRecommendation } from '@/lib/types';
import { EXERCISES, REST_DURATION, WARMUP_DURATION_SECONDS } from '@/lib/constants';
import { formatDateKey, getWeekNumber, getSetsForWeek, getPreviousExerciseSessionDate } from '@/lib/workout-utils';
import { getTargets, getWeightTarget, evaluateTierProgress, isDeloadWeek } from '@/lib/progression';
import { getWorkoutOccurrenceIndex, getWorkoutType } from '@/lib/schedule';
import { clearActiveWorkoutDraft, loadActiveWorkoutDraft, pwaStorage, saveActiveWorkoutDraft, loadUserProfile, saveUserProfile } from '@/lib/storage';
import { getChainsForRoutine, getProgressionPath, getSubstitutionPath, resolveExerciseKey, resolveExerciseKeyWithEquipment } from '@/lib/tiers';
import { EquipmentKey, canPerformExercise, getRequiredEquipment, getUnavailableProfileEquipment } from '@/lib/equipment';
import { getRoutine } from '@/lib/routines';
import { traceLiftDay } from '@/lib/debug-trace';
import { requireRestNotificationPermission, showRestCompleteNotification } from '@/lib/rest-notifications';
import { getResolvedSessionPlan } from '@/lib/routine-plan';
import { optimizeRoutineForFrontier } from '@/lib/frontier-optimizer';
import { evaluateDoubleProgression, getPrescriptionForChain } from '@/lib/smv';
import { hasExplicitInjuryMode } from '@/lib/session-volume-constraints';
import { getProgramSummary } from '@/lib/program-summary';
import { getNextSetAutoAdjust, type AutoAdjustSuggestion } from '@/lib/workout-auto-adjust';
import { getExerciseLoadStep, getNextHigherLoad, snapLoadTarget } from '@/lib/load-targets';
import {
  unlockAudio, playStart, playSetLogged, playCountdownTick,
  playRestComplete, playNextExercise, playSkip, playSessionComplete,
  playExerciseReady, playUndo,
} from '@/lib/audio';

export interface CoachingReference {
  reps: number;
  weight: number | null;
  rir: number | null;
}

export interface UseWorkoutReturn {
  state: WorkoutState;
  exerciseIndex: number;
  currentSet: number;
  setsPerExercise: number;
  timer: number;
  warmupDuration: 30 | 60;
  currentExercise: Exercise | undefined;
  currentTarget: number;
  currentWeightTarget: number;
  currentWeightStep: number;
  currentPrescription: SMVExercisePrescription | null;
  previousRep: number | null;
  previousWeight: number | null;
  previousRir: number | null;
  coachingReference: CoachingReference | null;
  autoAdjustSuggestion: AutoAdjustSuggestion | null;
  topRecommendation: AdaptiveRecommendation | null;
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
  canHandleNextExerciseMachineOccupied: boolean;
  timerPaused: boolean;
  advancedTiers: string[];
  hasSwapAlternative: boolean;
  swapAlternatives: Exercise[];
  canDeferMachineOccupied: boolean;
  isReady: boolean;
  isStorageHydrated: boolean;
  isRestoringActiveWorkout: boolean;
  persistenceError: string | null;
  startWorkout: () => Promise<void>;
  startWarmupTimer: () => void;
  repeatWarmupTimer: () => void;
  beginWorkoutAfterWarmup: () => void;
  setWarmupDuration: (seconds: 30 | 60) => void;
  logSet: (reps: number, weight?: number, rir?: number) => void;
  skipTimer: () => void;
  quitWorkout: () => void;
  refreshData: () => void;
  finishTransition: () => void;
  togglePauseTimer: () => void;
  undoLastSet: () => void;
  swapCurrentForOccupied: () => void;
  selectAlternativeForOccupied: (exerciseKey: ExerciseKey) => void;
  deferCurrentForOccupied: () => void;
  requeueCurrent: () => void;
  handleMachineOccupied: () => void;
  handleNextExerciseMachineOccupied: () => void;
  retryWorkoutSave: () => void;
}

type RequeuedExercise = { exercise: Exercise; setCount: number; chainIndex?: number };

export function useWorkout(date: Date): UseWorkoutReturn {
  const storageAdapter: StorageAdapter = pwaStorage;

  const [state, setState] = useState<WorkoutState>('idle');
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(0);
  const [timer, setTimer] = useState(REST_DURATION);
  const [warmupDuration, setWarmupDurationSeconds] = useState<30 | 60>(WARMUP_DURATION_SECONDS);
  const [sessionReps, setSessionReps] = useState<Record<string, SetEntry[]>>({});
  const [data, setData] = useState<WorkoutData>({});
  const [flashColor, setFlashColor] = useState<'green' | 'red' | null>(null);
  const [nextExerciseName, setNextExerciseName] = useState('');
  const [firstSessionDate, setFirstSessionDate] = useState<string | null>(null);
  const [timerPaused, setTimerPaused] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [advancedTiers, setAdvancedTiers] = useState<string[]>([]);
  const [unavailableEquipment, setUnavailableEquipment] = useState<EquipmentKey[]>([]);
  const [selectedSubstitutions, setSelectedSubstitutions] = useState<Record<number, ExerciseKey>>({});
  const [skippedChainIndices, setSkippedChainIndices] = useState<Set<number>>(new Set());
  const [requeuedExercises, setRequeuedExercises] = useState<RequeuedExercise[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [restorationChecked, setRestorationChecked] = useState(false);
  const [autoAdjustSuggestions, setAutoAdjustSuggestions] = useState<Record<string, AutoAdjustSuggestion>>({});
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

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

  const resetSessionPlanModifiers = useCallback(() => {
    setUnavailableEquipment([]);
    setSelectedSubstitutions({});
    setSkippedChainIndices(new Set());
    setRequeuedExercises([]);
  }, []);

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
    const unavailableForPlan = routine.id === 'gym'
      ? [...new Set([...getUnavailableProfileEquipment(userProfile?.availableEquipment), ...unavailableEquipment])]
      : unavailableEquipment;
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
      unavailableForPlan,
      { allowVolumeReduction: isDeloadWeek(weekNumber) || hasExplicitInjuryMode(userProfile) }
    ).map((item) => {
      const chainIndex = chainIndexLookup.get(item.chain.slotId) ?? item.chainIndex;
      const selectedKey = selectedSubstitutions[chainIndex];
      const selectedExercise = selectedKey && canPerformExercise(selectedKey, unavailableForPlan)
        ? EXERCISES.find((entry) => entry.key === selectedKey)
        : null;
      return {
        exercise: selectedExercise ?? item.exercise,
        setCount: item.setCount,
        chainIndex,
        prescription: selectedExercise && chains[chainIndex]
          ? { ...getPrescriptionForChain(chains[chainIndex], selectedExercise.key, setsPerExercise), sets: item.setCount }
          : item.prescription,
      };
    });
    return { workoutType: wt, workoutOccurrenceIndex: occurrenceIndex, derivedPlan: plan };
  }, [date, userProfile, data, unavailableEquipment, selectedSubstitutions, skippedChainIndices, setsPerExercise, weekNumber]);

  const exercisePlan = useMemo(() => [...derivedPlan, ...requeuedExercises.map((item) => ({
    exercise: item.exercise,
    setCount: item.setCount,
    chainIndex: item.chainIndex ?? -1,
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
  const currentSuggestionKey = currentExercise ? getSuggestionKey(currentExercise.key, currentSet) : null;
  const autoAdjustSuggestion = currentSuggestionKey ? autoAdjustSuggestions[currentSuggestionKey] ?? null : null;
  const topRecommendation = useMemo(() => {
    if (!hydrated || workoutType === 'rest') return null;
    return getProgramSummary(data, userProfile, date).adaptation.recommendations[0] ?? null;
  }, [data, date, hydrated, userProfile, workoutType]);
  const targets = currentExercise ? getTargets(currentExercise.key, weekNumber, date, data) : [];
  const previousLoggedSet = useMemo(() => {
    if (!currentExercise || currentSet === 0) return null;
    const loggedSets = sessionReps[currentExercise.key] ?? [];
    return loggedSets[currentSet - 1] ?? null;
  }, [currentExercise, currentSet, sessionReps]);
  const previousEntry = useMemo(() => {
    if (!currentExercise) return null;
    const prev = getPreviousExerciseSessionDate(date, data, currentExercise.key as ExerciseKey);
    if (!prev) return null;
    const sets = data[prev]?.[currentExercise.key as ExerciseKey];
    return sets && sets.length > currentSet ? sets[currentSet] : null;
  }, [data, date, currentExercise, currentSet]);
  const currentTarget = autoAdjustSuggestion?.reps
    ?? (previousLoggedSet !== null
      ? setEntryReps(previousLoggedSet)
      : currentPrescription?.minReps ?? targets[currentSet] ?? targets[0] ?? 10);
  const currentWeightTarget = useMemo(() => {
    if (!currentExercise || currentExercise.unit !== 'weighted') return 0;
    if (autoAdjustSuggestion?.weight !== null && autoAdjustSuggestion?.weight !== undefined) {
      return snapLoadTarget(currentExercise.key, autoAdjustSuggestion.weight, 'nearest') ?? autoAdjustSuggestion.weight;
    }
    const previousWeight = previousLoggedSet !== null ? setEntryWeight(previousLoggedSet) : null;
    if (previousWeight !== null) return snapLoadTarget(currentExercise.key, previousWeight, 'nearest') ?? previousWeight;
    const baseWeight = getWeightTarget(currentExercise.key, date, data);
    if (!currentPrescription) return baseWeight;
    const prevDateKey = getPreviousExerciseSessionDate(date, data, currentExercise.key as ExerciseKey);
    const prevSets = prevDateKey ? data[prevDateKey]?.[currentExercise.key as ExerciseKey] : null;
    if (!prevSets) return baseWeight;
    const decision = evaluateDoubleProgression(prevSets, currentPrescription);
    return decision.increaseLoad ? getNextHigherLoad(currentExercise.key, baseWeight) ?? baseWeight : baseWeight;
  }, [currentExercise, previousLoggedSet, autoAdjustSuggestion, date, data, currentPrescription]);

  const previousRep = previousEntry !== null ? setEntryReps(previousEntry) : null;
  const rawPreviousWeight = previousEntry !== null ? setEntryWeight(previousEntry) : null;
  const previousWeight = currentExercise && rawPreviousWeight !== null
    ? snapLoadTarget(currentExercise.key, rawPreviousWeight, 'nearest')
    : rawPreviousWeight;
  const previousRir = previousEntry !== null ? setEntryRir(previousEntry) : null;
  const coachingReference = useMemo<CoachingReference | null>(() => {
    if (!currentExercise) return null;
    const entry = currentSet === 0
      ? previousEntry
      : (sessionReps[currentExercise.key] ?? [])[currentSet - 1] ?? null;
    if (entry === null) return null;
    return {
      reps: setEntryReps(entry),
      weight: snapLoadTarget(currentExercise.key, setEntryWeight(entry), 'nearest'),
      rir: setEntryRir(entry),
    };
  }, [currentExercise, currentSet, previousEntry, sessionReps]);

  useEffect(() => {
    if (state !== 'resting' && state !== 'warming-up') setTimerPaused(false);
  }, [state]);

  useEffect(() => {
    if (!hydrated || restoredDraftRef.current) return;
    restoredDraftRef.current = true;
    if (workoutType === 'rest' || exercises.length === 0) {
      setRestorationChecked(true);
      return;
    }
    const draft = loadActiveWorkoutDraft();
    if (!draft || draft.dateKey !== dateKey || draft.workoutType !== workoutType) {
      if (draft && draft.dateKey !== dateKey) clearActiveWorkoutDraft();
      setRestorationChecked(true);
      return;
    }

    const requeued = draft.requeuedExercises
      .map((item) => {
        const exercise = EXERCISES.find((ex) => ex.key === item.exerciseKey);
        if (!exercise) return null;
        const requeued: RequeuedExercise = { exercise, setCount: item.setCount };
        if (item.chainIndex !== undefined) requeued.chainIndex = item.chainIndex;
        return requeued;
      })
      .filter((item): item is RequeuedExercise => item !== null);

    sessionRepsRef.current = draft.sessionReps;
    startedAtRef.current = draft.startedAt;
    timerEndRef.current = draft.timerEndAt;
    setUnavailableEquipment(draft.unavailableEquipment as EquipmentKey[]);
    setSelectedSubstitutions(draft.selectedSubstitutions ?? {});
    setSkippedChainIndices(new Set(draft.skippedChainIndices));
    setRequeuedExercises(requeued);
    setExerciseIndex(draft.exerciseIndex);
    setCurrentSet(draft.currentSet);
    setSessionReps(draft.sessionReps);
    setNextExerciseName(draft.nextExerciseName);
    setTimerPaused(draft.timerPaused);
    setWarmupDurationSeconds(draft.warmupDuration ?? WARMUP_DURATION_SECONDS);

    if (draft.state === 'warming-up' && !draft.timerPaused && draft.timerEndAt !== null) {
      const remaining = Math.max(0, Math.ceil((draft.timerEndAt - Date.now()) / 1000));
      setTimer(remaining);
    } else if (draft.state === 'resting' && !draft.timerPaused && draft.timerEndAt !== null) {
      const remaining = Math.max(0, Math.ceil((draft.timerEndAt - Date.now()) / 1000));
      if (remaining <= 0) {
        const setCount = exercisePlan[draft.exerciseIndex]?.setCount ?? setsPerExercise;
        if (draft.currentSet + 1 < setCount) {
          setCurrentSet(draft.currentSet + 1);
          setTimer(currentPrescription?.restSeconds ?? restDurationRef.current);
          setState('exercising');
          setRestorationChecked(true);
          return;
        }
        const nextIdx = draft.exerciseIndex + 1;
        if (nextIdx < exercises.length) {
          setExerciseIndex(nextIdx);
          setCurrentSet(0);
          setNextExerciseName(exercises[nextIdx].name);
          setTimer(currentPrescription?.restSeconds ?? restDurationRef.current);
          setState('transitioning');
          setRestorationChecked(true);
          return;
        }
      } else {
        setTimer(remaining);
      }
    } else {
      setTimer(draft.timer);
    }

    setState(draft.state);
    setRestorationChecked(true);
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
      warmupDuration,
      timerEndAt: timerEndRef.current,
      timerPaused,
      nextExerciseName,
      unavailableEquipment,
      selectedSubstitutions,
      skippedChainIndices: [...skippedChainIndices],
      requeuedExercises: requeuedExercises.map((item) => ({
        exerciseKey: item.exercise.key,
        setCount: item.setCount,
        chainIndex: item.chainIndex,
      })),
    });
  }, [
    currentSet,
    dateKey,
    exerciseIndex,
    nextExerciseName,
    requeuedExercises,
    selectedSubstitutions,
    skippedChainIndices,
    timer,
    warmupDuration,
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
    if (state === 'warming-up' && !timerPaused && timer > 0) {
      if (timerEndRef.current === null) {
        timerEndRef.current = Date.now() + timer * 1000;
      }
      timerRef.current = setInterval(() => {
        const remaining = timerEndRef.current
          ? Math.max(0, Math.ceil((timerEndRef.current - Date.now()) / 1000))
          : 0;
        setTimer((t) => {
          if (remaining <= 0 || t <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            playExerciseReady();
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
  }, [state, timer === restDurationRef.current, timerPaused, notifyRestCompleteIfHidden, timer]);

  const saveAndComplete = useCallback(async () => {
    setPersistenceError(null);
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
    const sessionResult = await storageAdapter.saveSession(dateKey, session);
    if (!sessionResult.success) {
      setPersistenceError(sessionResult.reason);
      return;
    }
    const firstSessionResult = await storageAdapter.setFirstSessionDate(dateKey);
    if (!firstSessionResult.success) {
      setPersistenceError(firstSessionResult.reason);
      return;
    }
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
      const profileResult = saveUserProfile(updatedProfile);
      if (!profileResult.success) {
        setPersistenceError(profileResult.reason);
        return;
      }
      userProfileRef.current = updatedProfile;
      setUserProfile(updatedProfile);
    }

    playSessionComplete();
    const clearDraftResult = clearActiveWorkoutDraft();
    if (!clearDraftResult.success) {
      setPersistenceError(clearDraftResult.reason);
      return;
    }
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

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && state === 'warming-up' && timerEndRef.current) {
        const remaining = Math.max(0, Math.ceil((timerEndRef.current - Date.now()) / 1000));
        setTimer(remaining);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state]);

  const finishTransition = useCallback(() => {
    playExerciseReady();
    setState('exercising');
  }, []);

  const startWorkout = useCallback(async () => {
    setPersistenceError(null);
    unlockAudio();
    playStart();
    clearActiveWorkoutDraft();
    resetSessionPlanModifiers();
    startedAtRef.current = new Date().toISOString();
    sessionRepsRef.current = {};
    timerEndRef.current = null;
    timerPauseStartRef.current = null;
    restCompletionNotifiedRef.current = false;
    setExerciseIndex(0);
    setCurrentSet(0);
    setSessionReps({});
    setAutoAdjustSuggestions({});
    setWarmupDurationSeconds(WARMUP_DURATION_SECONDS);
    setTimer(WARMUP_DURATION_SECONDS);
    timerEndRef.current = null;
    setTimerPaused(true);
    countdownPlayedRef.current = new Set();
    setState('warming-up');
    void requireRestNotificationPermission().catch((error: unknown) => {
      traceLiftDay('rest.notification_permission_unavailable', {
        message: error instanceof Error ? error.message : 'Rest notification permission unavailable.',
      });
    });
    traceLiftDay('workout.start', {
      dateKey,
      workoutType,
      exerciseCount: exercises.length,
      firstExercise: exercises[0]?.name ?? null,
    });
  }, [dateKey, exercises, resetSessionPlanModifiers, workoutType]);

  const startWarmupTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    unlockAudio();
    playStart();
    timerEndRef.current = Date.now() + timer * 1000;
    timerPauseStartRef.current = null;
    countdownPlayedRef.current = new Set();
    setTimerPaused(false);
  }, [timer]);

  const repeatWarmupTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    unlockAudio();
    playStart();
    setTimer(warmupDuration);
    timerEndRef.current = Date.now() + warmupDuration * 1000;
    timerPauseStartRef.current = null;
    countdownPlayedRef.current = new Set();
    setTimerPaused(false);
  }, [warmupDuration]);

  const beginWorkoutAfterWarmup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    timerEndRef.current = null;
    timerPauseStartRef.current = null;
    countdownPlayedRef.current = new Set();
    setTimerPaused(false);
    playExerciseReady();
    setState('exercising');
  }, []);

  const setWarmupDuration = useCallback((seconds: 30 | 60) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    countdownPlayedRef.current = new Set();
    setWarmupDurationSeconds(seconds);
    timerEndRef.current = timerPaused ? null : Date.now() + seconds * 1000;
    setTimer(seconds);
  }, [timerPaused]);

  const logSet = useCallback((reps: number, weight?: number, rir?: number) => {
    if (!currentExercise) return;
    setPersistenceError(null);
    const key = currentExercise.key;
    const loggedWeight = currentExercise.unit === 'weighted'
      ? snapLoadTarget(currentExercise.key, weight ?? 0, 'nearest') ?? 0
      : null;
    const entry: SetEntry = loggedWeight !== null ? { reps, weight: loggedWeight, rir } : reps;
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
    if (isLastSet && isLastExercise) {
      saveAndComplete();
      return;
    }

    if (!isLastSet) {
      const nextSuggestion = getNextSetAutoAdjust({
        exerciseKey: currentExercise.key,
        unit: currentExercise.unit,
        loggedSet: {
          reps,
          weight: loggedWeight,
          rir: rir ?? currentPrescription?.targetRirMax ?? 2,
        },
        prescription: currentPrescription,
        priorSets: sessionRepsRef.current[key]?.slice(0, -1) ?? [],
        previousSessionReference: previousEntry
          ? {
              reps: setEntryReps(previousEntry),
              weight: setEntryWeight(previousEntry),
              rir: setEntryRir(previousEntry) ?? currentPrescription?.targetRirMax ?? 2,
            }
          : null,
        topRecommendation,
        currentSuggestion: autoAdjustSuggestion,
      });
      setAutoAdjustSuggestions((prev) => ({
        ...prev,
        [getSuggestionKey(key, currentSet + 1)]: nextSuggestion,
      }));
    }

    setTimeout(() => {
      restCompletionNotifiedRef.current = false;
      const restSeconds = currentPrescription?.restSeconds ?? restDurationRef.current;
      setTimer(restSeconds);
      timerEndRef.current = Date.now() + restSeconds * 1000;
      setTimerPaused(false);
      setState('resting');
    }, 700);
  }, [currentExercise, currentSet, currentSetCount, exerciseIndex, exercises, currentPrescription, currentTarget, previousEntry, topRecommendation, autoAdjustSuggestion, saveAndComplete]);

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
    setAutoAdjustSuggestions({});
    resetSessionPlanModifiers();
  }, [resetSessionPlanModifiers]);

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
    setAutoAdjustSuggestions((prev) => {
      const next = { ...prev };
      delete next[getSuggestionKey(key, currentSet)];
      return next;
    });
    playUndo();
    setTimer(currentPrescription?.restSeconds ?? REST_DURATION);
    setState('exercising');
  }, [currentExercise, currentPrescription, currentSet]);

  const refreshData = useCallback(() => {
    storageAdapter.loadWorkoutData().then(setData);
  }, [storageAdapter]);

  const hasSwapAlternative = useMemo(() => {
    if (exerciseIndex >= derivedPlan.length) return false;
    const ex = derivedPlan[exerciseIndex]?.exercise;
    if (!ex) return false;
    const required = getRequiredEquipment(ex.key);
    if (required.length === 0) return false;
    const baseRoutine = getRoutine(userProfile?.activeRoutine ?? 'gym');
    const routine = optimizeRoutineForFrontier(baseRoutine, userProfile, data, setsPerExercise).routine;
    const profileUnavailable = routine.id === 'gym' ? getUnavailableProfileEquipment(userProfile?.availableEquipment) : [];
    const newUnavailable = [...new Set([...profileUnavailable, ...unavailableEquipment, ...required])];
    if (workoutType === 'rest') return false;
    const chains = getChainsForRoutine(routine, workoutType, workoutOccurrenceIndex ?? undefined);
    const chainIdx = derivedPlan[exerciseIndex]?.chainIndex;
    const chain = chains[chainIdx];
    if (!chain) return false;
    const tiers = userProfile?.tiers ?? {};
    const newKey = resolveExerciseKeyWithEquipment(chain, tiers, newUnavailable, routine.id === 'gym');
    return newKey !== ex.key;
  }, [derivedPlan, exerciseIndex, unavailableEquipment, userProfile, data, setsPerExercise, workoutType, workoutOccurrenceIndex]);

  const swapAlternatives = useMemo(() => {
    const currentPlanItem = exercisePlan[exerciseIndex];
    const ex = currentPlanItem?.exercise;
    if (!ex) return [];
    const required = getRequiredEquipment(ex.key);
    if (required.length === 0) return [];
    const baseRoutine = getRoutine(userProfile?.activeRoutine ?? 'gym');
    const routine = optimizeRoutineForFrontier(baseRoutine, userProfile, data, setsPerExercise).routine;
    const profileUnavailable = routine.id === 'gym' ? getUnavailableProfileEquipment(userProfile?.availableEquipment) : [];
    const newUnavailable = [...new Set([...profileUnavailable, ...unavailableEquipment, ...required])];
    if (workoutType === 'rest') return [];
    const chains = getChainsForRoutine(routine, workoutType, workoutOccurrenceIndex ?? undefined);
    const chainIdx = currentPlanItem.chainIndex;
    if (chainIdx < 0) return [];
    const chain = chains[chainIdx];
    if (!chain) return [];
    const candidates = getSubstitutionPath(chain)
      .filter((key) => key !== ex.key && canPerformExercise(key, newUnavailable));
    const gymCandidates = routine.id === 'gym'
      ? candidates.filter((key) => getRequiredEquipment(key).some((eq) => eq !== 'none'))
      : candidates;
    const available = gymCandidates.length > 0 ? gymCandidates : candidates;
    return available
      .map((key) => EXERCISES.find((entry) => entry.key === key))
      .filter((entry): entry is Exercise => entry !== undefined)
      .slice(0, 4);
  }, [exercisePlan, exerciseIndex, unavailableEquipment, userProfile, data, setsPerExercise, workoutType, workoutOccurrenceIndex]);

  const swapCurrentForOccupied = useCallback(() => {
    const ex = exercises[exerciseIndex];
    if (!ex) return;
    const required = getRequiredEquipment(ex.key);
    setUnavailableEquipment((prev) => [...new Set([...prev, ...required])]);
  }, [exercises, exerciseIndex]);

  const selectAlternativeForOccupied = useCallback((exerciseKey: ExerciseKey) => {
    const ex = exercises[exerciseIndex];
    if (!ex) return;
    const chainIdx = exercisePlan[exerciseIndex]?.chainIndex;
    if (chainIdx === undefined || chainIdx < 0) return;
    const required = getRequiredEquipment(ex.key);
    const baseRoutine = getRoutine(userProfile?.activeRoutine ?? 'gym');
    const routine = optimizeRoutineForFrontier(baseRoutine, userProfile, data, setsPerExercise).routine;
    const profileUnavailable = routine.id === 'gym' ? getUnavailableProfileEquipment(userProfile?.availableEquipment) : [];
    const sessionUnavailable = [...new Set([...unavailableEquipment, ...required])];
    const combinedUnavailable = [...new Set([...profileUnavailable, ...sessionUnavailable])];
    if (!canPerformExercise(exerciseKey, combinedUnavailable)) return;
    const selectedExercise = EXERCISES.find((entry) => entry.key === exerciseKey);
    if (!selectedExercise) return;
    setUnavailableEquipment(sessionUnavailable);
    setAutoAdjustSuggestions({});
    if (exerciseIndex < derivedPlan.length) {
      setSelectedSubstitutions((prev) => ({ ...prev, [chainIdx]: exerciseKey }));
    } else {
      const requeuedIndex = exerciseIndex - derivedPlan.length;
      setRequeuedExercises((prev) => prev.map((item, index) => (
        index === requeuedIndex ? { ...item, exercise: selectedExercise } : item
      )));
    }
    setCurrentSet(0);
  }, [data, derivedPlan.length, exerciseIndex, exercisePlan, exercises, setsPerExercise, unavailableEquipment, userProfile]);

  const canDeferMachineOccupied = exerciseIndex + 1 < exercises.length;

  const deferCurrentForOccupied = useCallback(() => {
    const ex = exercises[exerciseIndex];
    if (!ex || exerciseIndex + 1 >= exercises.length) return;
    traceLiftDay('workout.exercise.occupied_defer', {
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
      setRequeuedExercises((prev) => [...prev, { exercise: ex, setCount: currentSetCount, chainIndex: chainIdx }]);
      setAutoAdjustSuggestions({});
      setCurrentSet(0);
      return;
    }

    const requeuedIndex = exerciseIndex - derivedPlan.length;
    setRequeuedExercises((prev) => {
      const next = [...prev];
      const [current] = next.splice(requeuedIndex, 1);
      if (!current) return prev;
      next.push(current);
      return next;
    });
    setAutoAdjustSuggestions({});
    setCurrentSet(0);
  }, [currentSetCount, derivedPlan, exerciseIndex, exercises]);

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
      setRequeuedExercises((prev) => [...prev, { exercise: ex, setCount: currentSetCount, chainIndex: chainIdx }]);
      setAutoAdjustSuggestions({});
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
    if (canDeferMachineOccupied) {
      deferCurrentForOccupied();
    } else if (hasSwapAlternative) {
      swapCurrentForOccupied();
    } else {
      requeueCurrent();
    }
  }, [canDeferMachineOccupied, deferCurrentForOccupied, hasSwapAlternative, swapCurrentForOccupied, requeueCurrent]);

  const canHandleNextExerciseMachineOccupied = useMemo(() => {
    if (state !== 'resting') return false;
    if (currentSet + 1 < currentSetCount) return false;
    const targetIndex = exerciseIndex + 1;
    const nextPlanItem = exercisePlan[targetIndex];
    if (!nextPlanItem) return false;
    const required = getRequiredEquipment(nextPlanItem.exercise.key);
    if (required.length === 0) return false;
    if (targetIndex + 1 < exercises.length) return true;
    if (targetIndex >= derivedPlan.length) return false;
    if (workoutType === 'rest') return false;

    const baseRoutine = getRoutine(userProfile?.activeRoutine ?? 'gym');
    const routine = optimizeRoutineForFrontier(baseRoutine, userProfile, data, setsPerExercise).routine;
    const profileUnavailable = routine.id === 'gym' ? getUnavailableProfileEquipment(userProfile?.availableEquipment) : [];
    const newUnavailable = [...new Set([...profileUnavailable, ...unavailableEquipment, ...required])];
    const chains = getChainsForRoutine(routine, workoutType, workoutOccurrenceIndex ?? undefined);
    const chain = chains[nextPlanItem.chainIndex];
    if (!chain) return false;
    const tiers = userProfile?.tiers ?? {};
    const newKey = resolveExerciseKeyWithEquipment(chain, tiers, newUnavailable, routine.id === 'gym');
    return newKey !== nextPlanItem.exercise.key;
  }, [
    currentSet,
    currentSetCount,
    data,
    derivedPlan.length,
    exerciseIndex,
    exercisePlan,
    exercises.length,
    setsPerExercise,
    state,
    unavailableEquipment,
    userProfile,
    workoutOccurrenceIndex,
    workoutType,
  ]);

  const handleNextExerciseMachineOccupied = useCallback(() => {
    if (!canHandleNextExerciseMachineOccupied) return;
    const targetIndex = exerciseIndex + 1;
    const nextPlanItem = exercisePlan[targetIndex];
    if (!nextPlanItem) return;
    const required = getRequiredEquipment(nextPlanItem.exercise.key);
    if (required.length === 0) return;

    traceLiftDay('workout.exercise.next_occupied_during_rest', {
      exerciseIndex: targetIndex,
      exerciseName: nextPlanItem.exercise.name,
      derivedExerciseCount: derivedPlan.length,
      totalExercises: exercises.length,
      chainIndex: nextPlanItem.chainIndex,
    });

    setAutoAdjustSuggestions({});
    if (targetIndex + 1 < exercises.length) {
      if (targetIndex < derivedPlan.length) {
        setSkippedChainIndices((prev) => new Set([...prev, nextPlanItem.chainIndex]));
        setRequeuedExercises((prev) => [...prev, {
          exercise: nextPlanItem.exercise,
          setCount: nextPlanItem.setCount,
          chainIndex: nextPlanItem.chainIndex,
        }]);
        return;
      }

      const requeuedIndex = targetIndex - derivedPlan.length;
      setRequeuedExercises((prev) => {
        const next = [...prev];
        const [item] = next.splice(requeuedIndex, 1);
        if (!item) return prev;
        next.push(item);
        return next;
      });
      return;
    }

    setUnavailableEquipment((prev) => [...new Set([...prev, ...required])]);
  }, [canHandleNextExerciseMachineOccupied, derivedPlan.length, exerciseIndex, exercisePlan, exercises.length]);

  const nextExerciseAfterRestName = useMemo(() => {
    if (state !== 'resting') return null;
    const isLastSet = currentSet + 1 >= currentSetCount;
    if (!isLastSet) return null;
    return exercises[exerciseIndex + 1]?.name ?? null;
  }, [state, currentSet, currentSetCount, exercises, exerciseIndex]);

  const isRestoringActiveWorkout = useMemo(() => {
    if (!hydrated || restorationChecked || workoutType === 'rest' || exercises.length === 0) return false;
    const draft = loadActiveWorkoutDraft();
    return draft?.dateKey === dateKey && draft.workoutType === workoutType;
  }, [dateKey, exercises.length, hydrated, restorationChecked, workoutType]);

  return {
    state, exerciseIndex, currentSet, setsPerExercise: currentSetCount, timer, warmupDuration, currentExercise, currentTarget,
    currentWeightTarget, currentWeightStep: currentExercise ? getExerciseLoadStep(currentExercise.key) : 2.5, currentPrescription, previousRep, previousWeight, previousRir, coachingReference, autoAdjustSuggestion, topRecommendation, flashColor, sessionReps, weekNumber, data,
    totalExercises: exercises.length, totalPlannedSets, completedPlannedSets,
    exercises, nextExerciseName, nextExerciseAfterRestName, canHandleNextExerciseMachineOccupied,
    timerPaused, advancedTiers,
    isReady: hydrated && !isRestoringActiveWorkout,
    isStorageHydrated: hydrated,
    isRestoringActiveWorkout,
    persistenceError,
    startWorkout, startWarmupTimer, repeatWarmupTimer, beginWorkoutAfterWarmup, setWarmupDuration, logSet, skipTimer, quitWorkout, refreshData, finishTransition, togglePauseTimer, undoLastSet,
    swapCurrentForOccupied, selectAlternativeForOccupied, deferCurrentForOccupied, requeueCurrent,
    hasSwapAlternative, swapAlternatives, canDeferMachineOccupied, handleMachineOccupied, handleNextExerciseMachineOccupied,
    retryWorkoutSave: () => { void saveAndComplete(); },
  };
}

function getSuggestionKey(exerciseKey: ExerciseKey, setIndex: number): string {
  return `${exerciseKey}:${setIndex}`;
}
