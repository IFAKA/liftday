import { scoreSessionSets } from '../progress-insights';
import type {
  EffectiveVolumeEntry,
  ExerciseKey,
  FatigueState,
  ProgressionQuality,
  RecoveryState,
  RoutineConfig,
  SMVExercisePrescription,
  SetEntry,
  TierMap,
  UserProfile,
  WorkoutType,
  WorkoutData,
} from '../types';
import { getPrescriptionForChain } from '../smv';
import { resolveExerciseKey } from '../tiers';
import { getExerciseAdaptationMetadata } from './exercise-metadata';

export function getProgressionQuality(input: {
  data: WorkoutData;
  recovery: RecoveryState;
  fatigue: FatigueState;
  effectiveVolume: EffectiveVolumeEntry[];
  routine?: RoutineConfig;
  profile?: UserProfile | null;
  fallbackSets?: number;
}): ProgressionQuality[] {
  const byExercise = getExerciseSessionScores(input.data);
  const qualities = Object.entries(byExercise).map(([exerciseKey, scores]) => {
    const latest = scores[0];
    const previous = scores[1];
  const beforePrevious = scores[2];
    const metadata = getExerciseAdaptationMetadata(exerciseKey as ExerciseKey);
    const muscle = metadata?.primaryMuscles[0];

    if (!latest || !previous || !muscle) {
      return {
        trend: 'insufficient_data',
        velocity: 0,
        confidence: 0.2,
        exerciseKey: exerciseKey as ExerciseKey,
        muscle,
        reasons: ['Need at least three logged sessions for this lift before changing volume.'],
      } satisfies ProgressionQuality;
    }

    const prescription = resolveActivePrescription({
      routine: input.routine,
      tiers: input.profile?.tiers ?? {},
      fallbackSets: input.fallbackSets ?? 3,
      exerciseKey: exerciseKey as ExerciseKey,
      workoutType: latest.workoutType,
    });
    const ratio = previous.score > 0 ? latest.score / previous.score : 1;
    const velocity = roundTwo((ratio - 1) * 100);
    const recovery = input.recovery.muscles[muscle]?.recoveryState ?? 0.8;
    const muscleVolume = input.effectiveVolume.find((entry) => entry.muscle === muscle);
    const localFatigue = input.fatigue.localMuscleFatigue[muscle] ?? 0;
    const reasons: string[] = [];
    let trend: ProgressionQuality['trend'] = 'flat';

    const consecutiveRegression = Boolean(
      beforePrevious &&
      latest.score < previous.score * 0.96 &&
      previous.score < beforePrevious.score * 0.96
    );

    const execution = prescription
      ? classifyPrescribedExecution({ latest, previous, beforePrevious, prescription, recovery, localFatigue, systemicFatigue: input.fatigue.systemicFatigue })
      : null;

    if (execution?.trend === 'productive_progress') {
      trend = 'productive_progress';
      reasons.push(execution.reason);
    } else if (execution?.trend === 'build_reps') {
      trend = 'build_reps';
      reasons.push(execution.reason);
    } else if (execution?.trend === 'fatigue_masked') {
      trend = 'fatigue_masked';
      reasons.push(execution.reason);
    } else if (ratio >= 1.04) {
      trend = prescription ? 'productive_progress' : 'improving';
      reasons.push(prescription
        ? 'Output improved while execution stayed inside the active prescription.'
        : 'Estimated performance is up versus the previous exposure.');
    } else if (consecutiveRegression && (recovery < 0.55 || localFatigue > 0.65 || input.fatigue.systemicFatigue > 0.65)) {
      trend = 'fatigue_masked';
      reasons.push('Performance is down for two consecutive exposures while recovery or fatigue is limiting output.');
    } else if (consecutiveRegression) {
      trend = 'recovery_bottleneck';
      reasons.push('Performance is down for two consecutive exposures without enough recovery margin.');
    } else if (muscleVolume?.status === 'high') {
      trend = 'junk_volume';
      reasons.push('Volume is above target without a matching performance gain.');
    } else if (muscleVolume?.status === 'low') {
      trend = 'undertraining';
      reasons.push('Effective weekly volume is below the productive floor.');
    } else {
      reasons.push('Performance is stable inside normal session noise.');
    }

    return {
      trend,
      velocity,
      confidence: 0.72,
      exerciseKey: exerciseKey as ExerciseKey,
      muscle,
      reasons,
    } satisfies ProgressionQuality;
  });

  if (qualities.length === 0) {
    return [{
      trend: 'insufficient_data',
      velocity: 0,
      confidence: 0.1,
      reasons: ['No logged workout history yet; recommendations stay conservative.'],
    }];
  }

  return qualities.sort((a, b) => b.confidence - a.confidence);
}

interface ExerciseSessionScore {
  dateKey: string;
  workoutType: Exclude<WorkoutType, 'rest'>;
  sets: SetEntry[];
  score: number;
  avgReps: number;
  minReps: number;
  avgWeight: number;
  avgRir: number;
}

function getExerciseSessionScores(data: WorkoutData): Partial<Record<ExerciseKey, ExerciseSessionScore[]>> {
  const result: Partial<Record<ExerciseKey, ExerciseSessionScore[]>> = {};

  for (const [dateKey, session] of Object.entries(data)) {
    for (const [key, value] of Object.entries(session)) {
      if (!Array.isArray(value)) continue;
      const sets = value as SetEntry[];
      const score = scoreSessionSets(sets);
      const exerciseKey = key as ExerciseKey;
      result[exerciseKey] = [...(result[exerciseKey] ?? []), {
        dateKey,
        workoutType: session.workout_type,
        sets,
        score,
        ...summarizeSets(sets),
      }];
    }
  }

  for (const key of Object.keys(result) as ExerciseKey[]) {
    result[key] = result[key]!.sort((a, b) => b.dateKey.localeCompare(a.dateKey)).slice(0, 3);
  }

  return result;
}

function classifyPrescribedExecution(input: {
  latest: ExerciseSessionScore;
  previous: ExerciseSessionScore;
  beforePrevious?: ExerciseSessionScore;
  prescription: SMVExercisePrescription;
  recovery: number;
  localFatigue: number;
  systemicFatigue: number;
}): Pick<ProgressionQuality, 'trend'> & { reason: string } | null {
  const latestInRepRange = input.latest.minReps >= input.prescription.minReps;
  const latestAtTargetRir = input.latest.avgRir >= input.prescription.targetRirMin &&
    input.latest.avgRir <= input.prescription.targetRirMax;
  const outputChange = input.previous.score > 0 ? input.latest.score / input.previous.score : 1;
  const repsChange = input.latest.avgReps - input.previous.avgReps;
  const loadIncreased = input.latest.avgWeight > input.previous.avgWeight * 1.02;
  const loadSameOrUp = input.latest.avgWeight >= input.previous.avgWeight * 0.98;
  const outputDropped = outputChange < 0.98;
  const consecutiveOutputDropped = Boolean(
    input.beforePrevious &&
    input.latest.score < input.previous.score * 0.96 &&
    input.previous.score < input.beforePrevious.score * 0.96
  );
  const outputImproved = outputChange >= 1.02 || (loadSameOrUp && repsChange > 0.4);
  const fatigueLimited = input.recovery < 0.55 || input.localFatigue > 0.65 || input.systemicFatigue > 0.65;

  if (consecutiveOutputDropped && fatigueLimited) {
    return {
      trend: 'fatigue_masked',
      reason: 'Performance fell for two consecutive exposures while recovery or fatigue is limiting output.',
    };
  }

  if ((loadIncreased && !latestInRepRange) || (outputDropped && latestAtTargetRir)) {
    return {
      trend: 'build_reps',
      reason: `Load moved ahead of the ${input.prescription.minReps}-${input.prescription.maxReps} rep target; repeat or reduce load before adding volume.`,
    };
  }

  if (outputImproved && latestInRepRange && latestAtTargetRir) {
    return {
      trend: 'productive_progress',
      reason: 'Reps or load improved while staying inside the target reps and RIR.',
    };
  }

  return null;
}

function summarizeSets(sets: SetEntry[]): Pick<ExerciseSessionScore, 'avgReps' | 'minReps' | 'avgWeight' | 'avgRir'> {
  if (sets.length === 0) return { avgReps: 0, minReps: 0, avgWeight: 0, avgRir: 2 };
  const reps = sets.map((set) => typeof set === 'number' ? set : set.reps);
  const weights = sets.map((set) => typeof set === 'number' ? 0 : set.weight);
  const rirs = sets.map((set) => typeof set === 'number' ? 2 : set.rir ?? 2);
  return {
    avgReps: mean(reps),
    minReps: Math.min(...reps),
    avgWeight: mean(weights),
    avgRir: mean(rirs),
  };
}

function resolveActivePrescription(input: {
  routine?: RoutineConfig;
  tiers: TierMap;
  fallbackSets: number;
  exerciseKey: ExerciseKey;
  workoutType: Exclude<WorkoutType, 'rest'>;
}): SMVExercisePrescription | null {
  if (!input.routine) return null;
  const activeMatches = input.routine.tierChains
    .map((chain) => ({ chain, exerciseKey: resolveExerciseKey(chain, input.tiers) }))
    .filter((entry) => entry.exerciseKey === input.exerciseKey);
  const matched = activeMatches.find((entry) => entry.chain.workoutType === input.workoutType) ?? activeMatches[0];
  return matched ? getPrescriptionForChain(matched.chain, input.exerciseKey, input.fallbackSets) : null;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
