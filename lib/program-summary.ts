import { EXERCISES } from './constants';
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
import { getFirstSessionDate, loadUserProfile, loadWorkoutData } from './storage';
import { resolveExerciseKey } from './tiers';
import { Exercise, RoutineConfig, UserProfile, WorkoutData } from './types';
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
  const routine = optimizer.routine;
  const weeklyExercises = getWeeklyExercises(routine, profile);
  const signal = getProgressSignal(data, weeklyExercises);
  const diagnosis = getProgressDiagnosis(data, weeklyExercises, optimizer.score);

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
