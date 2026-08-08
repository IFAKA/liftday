import { EXERCISES } from './constants';
import { getFatigueState } from './adaptation/fatigue-engine';
import { getProgressionQuality } from './adaptation/progression-engine';
import { getRecoveryState } from './adaptation/recovery-engine';
import { getAdaptiveRecommendations } from './adaptation/recommendation-engine';
import { getEffectiveWeeklyVolume } from './adaptation/volume-engine';
import { FrontierOptimizerResult, optimizeRoutineForFrontier } from './frontier-optimizer';
import {
  formatProgressForPrompt,
  getProgressDiagnosis,
  getProgressFrontier,
  getProgressSignal,
  getRoutineAdjustmentDecision,
  ProgressDiagnosis,
  ProgressFrontier,
  ProgressSignal,
  RoutineAdjustmentDecision,
} from './progress-insights';
import { getRoutine } from './routines';
import { getFirstSessionDate, loadDailyLogs, loadUserProfile, loadWorkoutData } from './storage';
import { resolveExerciseKey } from './tiers';
import { Exercise, OptimizationContext, RoutineConfig, UserProfile, WorkoutData } from './types';
import { getSetsForWeek, getWeekNumber } from './workout-utils';

export interface ProgramSummary {
  data: WorkoutData;
  profile: UserProfile | null;
  routine: RoutineConfig;
  optimizer: FrontierOptimizerResult;
  setsPerExercise: number;
  weeklyExercises: Exercise[];
  signal: ProgressSignal;
  diagnosis: ProgressDiagnosis;
  routineDecision: RoutineAdjustmentDecision;
  frontier: ProgressFrontier;
  progressPrompt: string;
  adaptation: OptimizationContext;
}

export function getProgramSummary(
  data: WorkoutData,
  profile: UserProfile | null,
  today: Date = new Date(),
  routineId = profile?.activeRoutine ?? 'gym'
): ProgramSummary {
  const baseRoutine = getRoutine(routineId);
  const weekNumber = getWeekNumber(getFirstSessionDate(), today);
  const setsPerExercise = getSetsForWeek(weekNumber, profile?.setsPerExercise);
  const optimizer = optimizeRoutineForFrontier(baseRoutine, profile, data, setsPerExercise);
  // The workbook routine is fixed. The optimizer remains available for diagnostics,
  // but never owns the active exercise selection or schedule.
  const routine = baseRoutine;
  const weeklyExercises = getWeeklyExercises(routine, profile);
  const signal = getProgressSignal(data, weeklyExercises);
  const diagnosis = getProgressDiagnosis(data, weeklyExercises, optimizer.score);
  const adaptation = getAdaptationContext(data, profile, routine, setsPerExercise, today);

  return {
    data,
    profile,
    routine,
    optimizer,
    setsPerExercise,
    weeklyExercises,
    signal,
    diagnosis,
    routineDecision: getRoutineAdjustmentDecision(data, diagnosis, optimizer.score, signal),
    frontier: getProgressFrontier(data, weeklyExercises, optimizer.score, signal),
    progressPrompt: formatProgressForPrompt(data, weeklyExercises, signal),
    adaptation,
  };
}

export function loadProgramSummary(today: Date = new Date()): ProgramSummary {
  const profile = loadUserProfile();
  return getProgramSummary(loadWorkoutData(), profile, today);
}

export function loadProgramSummaryForData(data: WorkoutData, today: Date = new Date()): ProgramSummary {
  return getProgramSummary(data, loadUserProfile(), today);
}

export function getDefaultProgramSummary(data: WorkoutData): ProgramSummary {
  return getProgramSummary(data, null, new Date(), 'gym');
}

function getWeeklyExercises(routine: RoutineConfig, profile: UserProfile | null): Exercise[] {
  const tiers = profile?.tiers ?? {};

  return routine.tierChains
    .map((chain) => EXERCISES.find((exercise) => exercise.key === resolveExerciseKey(chain, tiers)))
    .filter((exercise): exercise is Exercise => Boolean(exercise));
}

function getAdaptationContext(
  data: WorkoutData,
  profile: UserProfile | null,
  routine: RoutineConfig,
  fallbackSets: number,
  today: Date
): OptimizationContext {
  const dailyLogs = loadDailyLogs();
  const effectiveVolume = getEffectiveWeeklyVolume({ data, routine, profile, fallbackSets, today });
  const recovery = getRecoveryState({ data, dailyLogs, today });
  const fatigue = getFatigueState({ data, dailyLogs, recovery, today });
  const progression = getProgressionQuality({ data, recovery, fatigue, effectiveVolume, routine, profile, fallbackSets });

  return getAdaptiveRecommendations({
    recovery,
    fatigue,
    progression,
    effectiveVolume,
    profile,
    today,
  });
}
