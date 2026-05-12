import type { Exercise, SMVExercisePrescription, SetEntry } from './types';
import { setEntryReps, setEntryRir } from './types';

export type SetCoachingTone = 'neutral' | 'good' | 'warning' | 'danger';

export interface SetCoachingResult {
  label: string;
  detail: string;
  tone: SetCoachingTone;
  normalizedScore: number;
  previousNormalizedScore: number | null;
}

export interface SetCoachingInput {
  unit: Exercise['unit'];
  reps: number;
  weight: number | null;
  rir: number;
  prescription: SMVExercisePrescription | null;
  previous?: {
    reps: number;
    weight: number | null;
    rir: number | null;
  } | null;
  priorSets?: SetEntry[];
  plannedSets?: number;
}

export function assessSetCoaching(input: SetCoachingInput): SetCoachingResult {
  const targetRirMin = input.prescription?.targetRirMin ?? 1;
  const targetRirMax = input.prescription?.targetRirMax ?? 2;
  const minReps = input.prescription?.minReps ?? 1;
  const maxReps = input.prescription?.maxReps ?? input.reps;
  const normalizedScore = getNormalizedSetScore(input.unit, input.reps, input.weight, input.rir, targetRirMax);
  const previousNormalizedScore = input.previous
    ? getNormalizedSetScore(
      input.unit,
      input.previous.reps,
      input.previous.weight,
      input.previous.rir ?? targetRirMax,
      targetRirMax
    )
    : null;
  const underperformed = previousNormalizedScore !== null && normalizedScore <= previousNormalizedScore * 0.95;
  const heavierButWorse = underperformed &&
    input.weight !== null &&
    input.previous !== null &&
    input.previous !== undefined &&
    input.previous.weight !== null &&
    input.weight > input.previous.weight;
  const missedMinReps = input.reps < minReps;
  const tooEasy = input.rir > targetRirMax;
  const tooHard = input.rir < targetRirMin;
  const priorTooEasy = (input.priorSets ?? []).filter((set) => {
    const reps = setEntryReps(set);
    const rir = setEntryRir(set) ?? targetRirMax;
    return rir > targetRirMax && reps < maxReps;
  }).length;

  if (underperformed && (missedMinReps || heavierButWorse || tooHard)) {
    return result('Reduce load', 'Output dropped at comparable effort.', 'danger', normalizedScore, previousNormalizedScore);
  }

  if (tooHard) {
    return result('Too hard', underperformed ? 'Hold or reduce next set.' : 'Hold weight and leave reps.', 'danger', normalizedScore, previousNormalizedScore);
  }

  if (underperformed) {
    return result('Underperformed', 'Hold weight until reps return.', 'warning', normalizedScore, previousNormalizedScore);
  }

  if (tooEasy) {
    if (input.reps < maxReps) {
      return result(
        'Too easy',
        priorTooEasy > 0 ? 'Add reps now.' : 'Push toward top reps.',
        'warning',
        normalizedScore,
        previousNormalizedScore
      );
    }

    return result('Too easy', 'Use a small load jump soon.', 'warning', normalizedScore, previousNormalizedScore);
  }

  if (hitsTopAtTarget(input, targetRirMin, targetRirMax, maxReps)) {
    return result('Progress next time', 'All sets hit top reps.', 'good', normalizedScore, previousNormalizedScore);
  }

  if (previousNormalizedScore !== null && normalizedScore < previousNormalizedScore * 1.02) {
    return result('Hold weight', 'Stable at target effort.', 'neutral', normalizedScore, previousNormalizedScore);
  }

  return result('On target', 'Performance is stable or up.', 'good', normalizedScore, previousNormalizedScore);
}

export function getNormalizedSetScore(
  unit: Exercise['unit'],
  reps: number,
  weight: number | null,
  actualRir: number,
  targetRirMax: number
): number {
  const targetEffortReps = Math.max(0, reps + (actualRir - targetRirMax));
  if (unit === 'weighted') return Math.max(1, weight ?? 0) * targetEffortReps;
  return targetEffortReps;
}

function hitsTopAtTarget(
  input: SetCoachingInput,
  targetRirMin: number,
  targetRirMax: number,
  maxReps: number
): boolean {
  const priorSets = input.priorSets ?? [];
  const plannedSets = input.plannedSets ?? 1;
  const currentHitsTop = input.reps >= maxReps && input.rir >= targetRirMin && input.rir <= targetRirMax;
  if (!currentHitsTop || priorSets.length + 1 < plannedSets) return false;

  return priorSets.every((set) => {
    const reps = setEntryReps(set);
    const rir = setEntryRir(set) ?? targetRirMax;
    return reps >= maxReps && rir >= targetRirMin && rir <= targetRirMax;
  });
}

function result(
  label: string,
  detail: string,
  tone: SetCoachingTone,
  normalizedScore: number,
  previousNormalizedScore: number | null
): SetCoachingResult {
  return { label, detail, tone, normalizedScore, previousNormalizedScore };
}
