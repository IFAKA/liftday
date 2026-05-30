import type {
  AdaptiveRecommendation,
  EffectiveVolumeEntry,
  FatigueState,
  OptimizationContext,
  ProgressionQuality,
  RecoveryState,
  UserProfile,
} from '../types';
import { MUSCLE_PRIORITY_BY_MUSCLE, MUSCLE_PRIORITY_PROFILES } from './exercise-metadata';
import { estimateMarginalStimulus, getTargetDateGuardrail, smvVelocityPerRecoverableFatigue } from './objective';

export function getAdaptiveRecommendations(input: {
  recovery: RecoveryState;
  fatigue: FatigueState;
  progression: ProgressionQuality[];
  effectiveVolume: EffectiveVolumeEntry[];
  profile: UserProfile | null;
  today?: Date;
}): OptimizationContext {
  const recommendations = buildRecommendations(input);
  const objectiveScore = smvVelocityPerRecoverableFatigue({
    effectiveVolume: input.effectiveVolume,
    recovery: input.recovery,
    fatigue: input.fatigue,
    targetDate: input.profile?.targetDate,
    today: input.today,
  });
  const progressionVelocity = mean(input.progression.map((entry) => entry.velocity));

  return {
    mode: 'recommend-first',
    objective: 'smv_velocity_per_recoverable_fatigue',
    recovery: input.recovery,
    fatigue: input.fatigue,
    progression: input.progression,
    effectiveVolume: input.effectiveVolume,
    recommendations,
    objectiveScore,
    targetDateGuardrail: getTargetDateGuardrail({
      targetDate: input.profile?.targetDate,
      objectiveScore,
      progressionVelocity,
      today: input.today,
    }),
  };
}

function buildRecommendations(input: {
  recovery: RecoveryState;
  fatigue: FatigueState;
  progression: ProgressionQuality[];
  effectiveVolume: EffectiveVolumeEntry[];
}): AdaptiveRecommendation[] {
  const primary: AdaptiveRecommendation[] = [];
  const systemicBlocked = input.recovery.systemic < 0.55 || input.fatigue.systemicFatigue > 0.72 || input.fatigue.jointRisk > 0.72;
  const negativeTrend = input.progression.find((entry) => (
    entry.trend === 'fatigue_masked' ||
    entry.trend === 'recovery_bottleneck' ||
    entry.trend === 'junk_volume'
  ));

  if (systemicBlocked && negativeTrend) {
    primary.push({
      action: 'deload',
      muscle: negativeTrend.muscle,
      exerciseKey: negativeTrend.exerciseKey,
      title: 'Deload First',
      summary: 'Fatigue is hiding output.',
      reason: input.fatigue.bottlenecks[0] ?? negativeTrend.reasons[0] ?? 'Recovery and performance are both constrained.',
      stimulusGain: 0,
      fatigueCost: -28,
      recoveryState: input.recovery.systemic,
      blockedConstraints: input.fatigue.bottlenecks,
      confidence: 0.78,
    });
  }

  for (const profile of MUSCLE_PRIORITY_PROFILES) {
    const volume = input.effectiveVolume.find((entry) => entry.muscle === profile.muscle);
    if (!volume || profile.maintenanceOnly) continue;

    const recovery = input.recovery.muscles[profile.muscle]?.recoveryState ?? 0.8;
    const localFatigue = input.fatigue.localMuscleFatigue[profile.muscle] ?? 0;
    const muscleTrend = input.progression.find((entry) => entry.muscle === profile.muscle);
    const blocked = getBlockedConstraints(recovery, localFatigue, input.fatigue.systemicFatigue, input.fatigue.jointRisk);
    const executionBlocked = muscleTrend?.trend === 'build_reps';
    const volumeReductionAllowed = allowsAutoVolumeReduction({
      trend: muscleTrend,
      recovery,
      systemicRecovery: input.recovery.systemic,
      jointRisk: input.fatigue.jointRisk,
    });

    if (executionBlocked) {
      primary.push({
        action: 'hold_progression',
        muscle: profile.muscle,
        exerciseKey: muscleTrend.exerciseKey,
        title: `Build ${profile.label} Reps`,
        summary: 'Repeat or reduce load.',
        reason: muscleTrend.reasons[0] ?? 'Load moved ahead of the prescribed rep range.',
        stimulusGain: 0,
        fatigueCost: 0,
        recoveryState: recovery,
        blockedConstraints: ['prescription execution'],
        confidence: Math.max(0.76, muscleTrend.confidence),
      });
    } else if (volume.status === 'low' && recovery >= 0.68 && localFatigue < 0.62 && input.fatigue.systemicFatigue < 0.68) {
      primary.push({
        action: 'add_volume',
        muscle: profile.muscle,
        exerciseKey: muscleTrend?.exerciseKey,
        title: `Add ${profile.label}`,
        summary: 'Add 1-2 effective sets.',
        reason: `${profile.label} is below target while recovery is usable.`,
        stimulusGain: estimateMarginalStimulus(profile.muscle, 2),
        fatigueCost: roundOne(2 * (0.8 + localFatigue)),
        recoveryState: recovery,
        blockedConstraints: [],
        confidence: muscleTrend?.trend === 'improving' ? 0.82 : 0.68,
      });
    } else if ((volume.status === 'high' || muscleTrend?.trend === 'junk_volume') && localFatigue > 0.55 && volumeReductionAllowed) {
      primary.push({
        action: 'reduce_volume',
        muscle: profile.muscle,
        exerciseKey: muscleTrend?.exerciseKey,
        title: `Trim ${profile.label}`,
        summary: 'Remove 1-2 low-return sets.',
        reason: `${profile.label} volume is costly relative to current response.`,
        stimulusGain: -estimateMarginalStimulus(profile.muscle, 1),
        fatigueCost: -roundOne(2 + localFatigue * 2),
        recoveryState: recovery,
        blockedConstraints: blocked,
        confidence: 0.72,
      });
    } else if (blocked.length > 0) {
      primary.push({
        action: 'hold_progression',
        muscle: profile.muscle,
        exerciseKey: muscleTrend?.exerciseKey,
        title: `Hold ${profile.label}`,
        summary: 'Keep load steady today.',
        reason: blocked[0],
        stimulusGain: 0,
        fatigueCost: 0,
        recoveryState: recovery,
        blockedConstraints: blocked,
        confidence: 0.64,
      });
    }
  }

  if (input.fatigue.axialFatigue > 0.68 && !primary.some((entry) => entry.action === 'deload')) {
    primary.push({
      action: 'swap_exercise',
      title: 'Lower Axial Cost',
      summary: 'Use braced or machine work.',
      reason: 'Axial fatigue is high; prefer chest-supported rows, machines, and cables before more barbell loading.',
      stimulusGain: 0,
      fatigueCost: -18,
      recoveryState: input.recovery.systemic,
      blockedConstraints: ['axial fatigue'],
      confidence: 0.7,
    });
  }

  if (primary.length === 0) {
    primary.push({
      action: 'hold_progression',
      title: 'Hold Course',
      summary: 'Current volume and recovery do not justify changing today.',
      reason: 'Current volume and recovery do not justify changing today.',
      stimulusGain: 0,
      fatigueCost: 0,
      recoveryState: input.recovery.systemic,
      blockedConstraints: [],
      confidence: 0.6,
    });
  }

  return primary
    .sort((a, b) => getRecommendationRank(a) - getRecommendationRank(b) || b.confidence - a.confidence)
    .slice(0, 5);
}

function allowsAutoVolumeReduction(input: {
  trend?: ProgressionQuality;
  recovery: number;
  systemicRecovery: number;
  jointRisk: number;
}): boolean {
  const consecutivePerformanceRegression = (
    input.trend?.trend === 'fatigue_masked' ||
    input.trend?.trend === 'recovery_bottleneck'
  ) && input.trend.velocity < 0;
  const recoveryCollapsed = input.recovery < 0.45 || input.systemicRecovery < 0.45;
  const significantJointPain = input.jointRisk > 0.72;
  return consecutivePerformanceRegression || recoveryCollapsed || significantJointPain;
}

function getBlockedConstraints(recovery: number, localFatigue: number, systemicFatigue: number, jointRisk: number): string[] {
  return [
    recovery < 0.62 ? 'local recovery is below the add-volume threshold' : null,
    localFatigue > 0.7 ? 'local fatigue is high' : null,
    systemicFatigue > 0.7 ? 'systemic fatigue is high' : null,
    jointRisk > 0.7 ? 'joint risk is elevated' : null,
  ].filter((entry): entry is string => Boolean(entry));
}

function getRecommendationRank(recommendation: AdaptiveRecommendation): number {
  if (recommendation.action === 'deload') return 0;
  if (recommendation.action === 'swap_exercise') return 1;
  const muscleRank = recommendation.muscle ? MUSCLE_PRIORITY_BY_MUSCLE[recommendation.muscle]?.rank ?? 99 : 99;
  if (recommendation.action === 'hold_progression' && recommendation.blockedConstraints.includes('prescription execution')) return 5 + muscleRank;
  if (recommendation.action === 'add_volume') return 10 + muscleRank;
  if (recommendation.action === 'reduce_volume') return 30 + muscleRank;
  return 50 + muscleRank;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}
