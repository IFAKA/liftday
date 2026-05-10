import { scoreSessionSets } from '../progress-insights';
import type {
  EffectiveVolumeEntry,
  ExerciseKey,
  FatigueState,
  ProgressionQuality,
  RecoveryState,
  SetEntry,
  WorkoutData,
} from '../types';
import { getExerciseAdaptationMetadata } from './exercise-metadata';

export function getProgressionQuality(input: {
  data: WorkoutData;
  recovery: RecoveryState;
  fatigue: FatigueState;
  effectiveVolume: EffectiveVolumeEntry[];
}): ProgressionQuality[] {
  const byExercise = getExerciseSessionScores(input.data);
  const qualities = Object.entries(byExercise).map(([exerciseKey, scores]) => {
    const latest = scores[0];
    const previous = scores[1];
    const metadata = getExerciseAdaptationMetadata(exerciseKey as ExerciseKey);
    const muscle = metadata?.primaryMuscles[0];

    if (!latest || !previous || !muscle) {
      return {
        trend: 'insufficient_data',
        velocity: 0,
        confidence: 0.2,
        exerciseKey: exerciseKey as ExerciseKey,
        muscle,
        reasons: ['Need at least two logged sessions for this lift.'],
      } satisfies ProgressionQuality;
    }

    const ratio = previous.score > 0 ? latest.score / previous.score : 1;
    const velocity = roundTwo((ratio - 1) * 100);
    const recovery = input.recovery.muscles[muscle]?.recoveryState ?? 0.8;
    const muscleVolume = input.effectiveVolume.find((entry) => entry.muscle === muscle);
    const localFatigue = input.fatigue.localMuscleFatigue[muscle] ?? 0;
    const reasons: string[] = [];
    let trend: ProgressionQuality['trend'] = 'flat';

    if (ratio >= 1.04) {
      trend = 'improving';
      reasons.push('Estimated performance is up versus the previous exposure.');
    } else if (ratio <= 0.96 && (recovery < 0.55 || localFatigue > 0.65 || input.fatigue.systemicFatigue > 0.65)) {
      trend = 'fatigue_masked';
      reasons.push('Performance is down while recovery or fatigue is limiting output.');
    } else if (ratio <= 0.96) {
      trend = 'recovery_bottleneck';
      reasons.push('Performance is down without enough recovery margin.');
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

function getExerciseSessionScores(data: WorkoutData): Partial<Record<ExerciseKey, { dateKey: string; score: number }[]>> {
  const result: Partial<Record<ExerciseKey, { dateKey: string; score: number }[]>> = {};

  for (const [dateKey, session] of Object.entries(data)) {
    for (const [key, value] of Object.entries(session)) {
      if (!Array.isArray(value)) continue;
      const score = scoreSessionSets(value as SetEntry[]);
      const exerciseKey = key as ExerciseKey;
      result[exerciseKey] = [...(result[exerciseKey] ?? []), { dateKey, score }];
    }
  }

  for (const key of Object.keys(result) as ExerciseKey[]) {
    result[key] = result[key]!.sort((a, b) => b.dateKey.localeCompare(a.dateKey)).slice(0, 3);
  }

  return result;
}

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
