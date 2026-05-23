import type { AdaptiveRecommendation, Exercise, ExerciseKey, SMVExercisePrescription, SetEntry } from './types';
import { setEntryReps, setEntryRir, setEntryWeight } from './types';
import { getNormalizedSetScore } from './set-coaching';
import { getNextHigherLoad, getNextLowerLoad, snapLoadTarget } from './load-targets';

export type AutoAdjustStatus =
  | 'Add reps'
  | 'Hold'
  | 'Reduce load'
  | 'Small jump next'
  | 'Add rest';

export type AutoAdjustTone = 'neutral' | 'good' | 'warning' | 'danger';

export interface AutoAdjustSetTarget {
  weight: number | null;
  reps: number;
  rir: number;
}

export interface AutoAdjustSuggestion extends AutoAdjustSetTarget {
  status: AutoAdjustStatus;
  reason: string;
  tone: AutoAdjustTone;
  programContext?: string;
  warning?: string;
}

export interface AutoAdjustInput {
  exerciseKey?: ExerciseKey;
  unit: Exercise['unit'];
  loggedSet: AutoAdjustSetTarget;
  prescription: SMVExercisePrescription | null;
  priorSets?: SetEntry[];
  previousSessionReference?: AutoAdjustSetTarget | null;
  topRecommendation?: AdaptiveRecommendation | null;
  currentSuggestion?: AutoAdjustSetTarget | null;
}

export function getNextSetAutoAdjust(input: AutoAdjustInput): AutoAdjustSuggestion {
  const targetRirMin = input.prescription?.targetRirMin ?? 1;
  const targetRirMax = input.prescription?.targetRirMax ?? 2;
  const minReps = input.prescription?.minReps ?? 1;
  const maxReps = input.prescription?.maxReps ?? Math.max(input.loggedSet.reps, minReps);
  const priorSets = input.priorSets ?? [];
  const allSets = [...priorSets, toSetEntry(input.loggedSet)];
  const previousSet = priorSets.length > 0 ? priorSets[priorSets.length - 1] : null;
  const previousReps = previousSet ? setEntryReps(previousSet) : input.previousSessionReference?.reps ?? null;
  const previousWeight = previousSet ? setEntryWeight(previousSet) : input.previousSessionReference?.weight ?? null;
  const previousRir = previousSet ? setEntryRir(previousSet) : input.previousSessionReference?.rir ?? null;
  const logged = clampTarget(input.loggedSet, input.exerciseKey, input.unit, minReps, maxReps, targetRirMin, targetRirMax);
  const guardrail = getProgramGuardrail(input.topRecommendation);
  const missedMinReps = input.loggedSet.reps < minReps;
  const tooEasy = input.loggedSet.rir > targetRirMax;
  const tooHard = input.loggedSet.rir < targetRirMin;
  const repsDropped = previousReps !== null && input.loggedSet.reps < previousReps;
  const loadIncreased = input.loggedSet.weight !== null && previousWeight !== null && input.loggedSet.weight > previousWeight;
  const normalizedScore = getNormalizedSetScore(input.unit, input.loggedSet.reps, input.loggedSet.weight, input.loggedSet.rir, targetRirMax);
  const previousScore = previousReps !== null
    ? getNormalizedSetScore(input.unit, previousReps, previousWeight, previousRir ?? targetRirMax, targetRirMax)
    : null;
  const performanceDropped = previousScore !== null && normalizedScore <= previousScore * 0.95;
  const allStrong = priorSets.length > 0 && allSets.every((set) => {
    const reps = setEntryReps(set);
    const rir = setEntryRir(set) ?? targetRirMax;
    return reps >= maxReps && rir >= targetRirMax;
  });

  let suggestion: AutoAdjustSuggestion;

  if (guardrail.kind === 'deload') {
    suggestion = makeSuggestion({
      ...logged,
      weight: reduceWeight(input.exerciseKey, logged.weight),
      reps: Math.max(minReps, Math.min(logged.reps, maxReps - 1)),
      rir: targetRirMax,
      status: 'Reduce load',
      reason: 'Program says Deload First, so reduce effort before chasing reps.',
      tone: 'danger',
      programContext: guardrail.context,
    });
  } else if (missedMinReps || tooHard || (performanceDropped && (repsDropped || loadIncreased))) {
    suggestion = makeSuggestion({
      ...logged,
      weight: missedMinReps || performanceDropped ? reduceWeight(input.exerciseKey, logged.weight) : logged.weight,
      reps: Math.max(minReps, Math.min(logged.reps, previousReps ?? logged.reps)),
      rir: targetRirMax,
      status: missedMinReps || performanceDropped ? 'Reduce load' : 'Add rest',
      reason: getHardSetReason({ missedMinReps, repsDropped, performanceDropped }),
      tone: missedMinReps || performanceDropped ? 'danger' : 'warning',
      programContext: guardrail.context,
    });
  } else if (tooEasy && input.loggedSet.reps < maxReps) {
    suggestion = makeSuggestion({
      ...logged,
      reps: Math.min(maxReps, input.loggedSet.reps + getRepNudge(input.loggedSet.rir, targetRirMax)),
      rir: targetRirMax,
      status: 'Add reps',
      reason: `You had ${input.loggedSet.rir} RIR below top reps, so push reps before load.`,
      tone: 'good',
      programContext: guardrail.context,
    });
  } else if (tooEasy && input.loggedSet.reps >= maxReps) {
    const canJumpNow = input.unit === 'weighted' && allStrong && guardrail.allowsLoadJump;
    suggestion = makeSuggestion({
      ...logged,
      weight: canJumpNow ? addSmallLoadJump(input.exerciseKey, logged.weight) : logged.weight,
      reps: canJumpNow ? minReps : maxReps,
      rir: targetRirMax,
      status: canJumpNow ? 'Small jump next' : 'Hold',
      reason: canJumpNow
        ? 'All sets were strong at top reps, so take the smallest load jump.'
        : 'Top reps were easy; hold this load until all sets prove it.',
      tone: canJumpNow ? 'good' : 'neutral',
      programContext: guardrail.context,
    });
  } else if (repsDropped || performanceDropped) {
    suggestion = makeSuggestion({
      ...logged,
      reps: Math.max(minReps, input.loggedSet.reps),
      rir: targetRirMax,
      status: 'Hold',
      reason: 'Reps dipped, so stop chasing reps and stabilize the next set.',
      tone: 'warning',
      programContext: guardrail.context,
    });
  } else if (input.loggedSet.reps < maxReps && input.loggedSet.rir >= targetRirMin && input.loggedSet.rir <= targetRirMax) {
    const canNudge = !guardrail.blocksRepNudge;
    suggestion = makeSuggestion({
      ...logged,
      reps: canNudge ? Math.min(maxReps, input.loggedSet.reps + 1) : input.loggedSet.reps,
      rir: targetRirMax,
      status: canNudge ? 'Add reps' : 'Hold',
      reason: canNudge
        ? 'Effort landed in range, so nudge reps while staying in the rep range.'
        : 'Program guardrails say to keep this set steady today.',
      tone: canNudge ? 'good' : 'neutral',
      programContext: guardrail.context,
    });
  } else {
    suggestion = makeSuggestion({
      ...logged,
      rir: targetRirMax,
      status: 'Hold',
      reason: 'Performance is in range; repeat the target and keep reps clean.',
      tone: 'neutral',
      programContext: guardrail.context,
    });
  }

  if (guardrail.blocksLoadJump && suggestion.weight !== null && logged.weight !== null && suggestion.weight > logged.weight) {
    suggestion = {
      ...suggestion,
      weight: logged.weight,
      reps: Math.min(maxReps, Math.max(suggestion.reps, logged.reps)),
      status: suggestion.status === 'Small jump next' ? 'Hold' : suggestion.status,
      reason: `${guardrail.shortReason} Reps can move before load.`,
      tone: suggestion.tone === 'good' ? 'neutral' : suggestion.tone,
    };
  }

  const warning = getManualEditWarning(input.currentSuggestion, input.loggedSet);
  return warning ? { ...suggestion, warning } : suggestion;
}

function clampTarget(
  target: AutoAdjustSetTarget,
  exerciseKey: ExerciseKey | undefined,
  unit: Exercise['unit'],
  minReps: number,
  maxReps: number,
  targetRirMin: number,
  targetRirMax: number
): AutoAdjustSetTarget {
  return {
    weight: unit === 'weighted' ? snapLoadTarget(exerciseKey, target.weight, 'nearest') : null,
    reps: Math.max(minReps, Math.min(maxReps, target.reps)),
    rir: Math.max(0, Math.min(4, target.rir ?? targetRirMax, Math.max(targetRirMin, targetRirMax))),
  };
}

function toSetEntry(target: AutoAdjustSetTarget): SetEntry {
  return target.weight === null
    ? { reps: target.reps, weight: 0, rir: target.rir }
    : { reps: target.reps, weight: target.weight, rir: target.rir };
}

function getRepNudge(rir: number, targetRirMax: number): number {
  return rir >= targetRirMax + 2 ? 2 : 1;
}

function reduceWeight(exerciseKey: ExerciseKey | undefined, weight: number | null): number | null {
  return getNextLowerLoad(exerciseKey, weight);
}

function addSmallLoadJump(exerciseKey: ExerciseKey | undefined, weight: number | null): number | null {
  return getNextHigherLoad(exerciseKey, weight);
}

function getHardSetReason(input: {
  missedMinReps: boolean;
  repsDropped: boolean;
  performanceDropped: boolean;
}): string {
  if (input.missedMinReps) return 'Missed rep floor: reduce to the next valid load.';
  if (input.repsDropped || input.performanceDropped) return 'Set output dipped at hard effort; reduce to the next valid load.';
  return 'Hard but still in range: hold load and add rest.';
}

function getProgramGuardrail(recommendation: AdaptiveRecommendation | null | undefined): {
  kind: 'deload' | 'hold' | 'build_reps' | 'lower_axial' | 'none';
  allowsLoadJump: boolean;
  blocksLoadJump: boolean;
  blocksRepNudge: boolean;
  context?: string;
  shortReason: string;
} {
  if (!recommendation) {
    return {
      kind: 'none',
      allowsLoadJump: true,
      blocksLoadJump: false,
      blocksRepNudge: false,
      shortReason: '',
    };
  }

  const context = `Program says ${recommendation.title}: ${recommendation.summary}`;

  if (recommendation.title === 'Deload First' || recommendation.action === 'deload') {
    return {
      kind: 'deload',
      allowsLoadJump: false,
      blocksLoadJump: true,
      blocksRepNudge: true,
      context,
      shortReason: 'Program says Deload First.',
    };
  }

  if (recommendation.title === 'Lower Axial Cost' || recommendation.action === 'swap_exercise') {
    return {
      kind: 'lower_axial',
      allowsLoadJump: false,
      blocksLoadJump: true,
      blocksRepNudge: false,
      context,
      shortReason: 'Program says Lower Axial Cost.',
    };
  }

  if (/^Build .+ Reps$/.test(recommendation.title)) {
    return {
      kind: 'build_reps',
      allowsLoadJump: false,
      blocksLoadJump: true,
      blocksRepNudge: false,
      context,
      shortReason: `Program says ${recommendation.title}.`,
    };
  }

  if (/^Hold /.test(recommendation.title)) {
    return {
      kind: 'hold',
      allowsLoadJump: false,
      blocksLoadJump: true,
      blocksRepNudge: true,
      context,
      shortReason: `Program says ${recommendation.title}.`,
    };
  }

  return {
    kind: 'none',
    allowsLoadJump: true,
    blocksLoadJump: false,
    blocksRepNudge: false,
    context: undefined,
    shortReason: '',
  };
}

function getManualEditWarning(
  suggestion: AutoAdjustSetTarget | null | undefined,
  loggedSet: AutoAdjustSetTarget
): string | undefined {
  if (!suggestion) return undefined;
  const changedWeight = suggestion.weight !== loggedSet.weight;
  const changedReps = suggestion.reps !== loggedSet.reps;
  const changedRir = suggestion.rir !== loggedSet.rir;
  if (!changedWeight && !changedReps && !changedRir) return undefined;
  return 'You changed the target; use the next set to verify, then hold or reduce if reps slip.';
}

function makeSuggestion(suggestion: AutoAdjustSuggestion): AutoAdjustSuggestion {
  return suggestion;
}
